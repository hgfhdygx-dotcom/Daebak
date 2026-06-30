// 익명 질문 인박스 — SERVER ONLY (Supabase service_role key + node:crypto 사용).
// 브라우저/클라이언트에서 import 금지(키 노출). /api/ask 라우트와 status 페이지(서버)만 사용.
// 스토리지는 이 파일 뒤로 추상화 — 나중에 다른 DB 로 바꿔도 호출부(route/status/admin)는 그대로.
import crypto from "node:crypto";

// 흔한 붙여넣기 실수 보정: 앞뒤 공백/끝 슬래시 제거, http(s):// 없으면 https:// 붙임.
function normalizeSupabaseUrl(u: string): string {
  u = (u || "").trim().replace(/\/+$/, "");
  if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

const SB_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || "");
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || "").trim();
const IP_SALT = process.env.QUESTION_IP_SALT || "daebak-default-salt";

export type QuestionIntent =
  | "shopping" | "kbeauty" | "travel_essential" | "local_place" | "product" | "other";

export type CreateQuestionInput = {
  question: string;
  email?: string;
  name?: string;
  notifyOnAnswer?: boolean;
  categoryGuess?: string;
  language?: string;
  sourcePage?: string;
  sourceComponent?: "home_search" | "search_page" | "answer_page" | "category_page" | "ask_page";
  website?: string; // honeypot — must stay empty
  ip?: string | null;
};

export type PublicQuestionView = {
  question: string;
  status: string;
  categoryGuess?: string;
  createdAt: string;
  publishedUrl?: string;
  answerSummary?: string;
  displayId?: string; // "Question 000001" (표시용 — 조회 키 아님)
  isPublic?: boolean;
  publicSlug?: string; // 공개 발행됐으면 /ask/[slug] 로 연결
};

export type RelatedGuide = { label: string; url: string };
export type PublicAsk = {
  slug: string;
  title: string;
  verdict?: string;
  summary?: string;
  goodCount: number;
  commentCount: number;
  publishedAt?: string;
  relatedGuides?: RelatedGuide[];
};
export type AskComment = { id: string; nickname?: string; comment: string; createdAt: string };

export class RateLimitError extends Error {}
export class NotConfiguredError extends Error {}

export function isConfigured(): boolean {
  return Boolean(SB_URL && SB_KEY);
}

function sbHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...extra };
}

// ── 휴리스틱: 의도/카테고리 추정(특정 글 하드코딩 X, 키워드 규칙) ──
const INTENT_RULES: [RegExp, QuestionIntent][] = [
  [/olive\s?young|sunscreen|skincare|serum|toner|cosmetic|makeup|beauty of joseon|anua|torriden|mediheal|k-?beauty/i, "kbeauty"],
  [/coupang|musinsa|gmarket|ably|online (store|shop)|shopping app|tax refund|where to buy|how to buy/i, "shopping"],
  [/wowpass|t-?money|\bsim\b|esim|wifi|airport|incheon|subway|metro|transport|klook|exchange|payment|arrival/i, "travel_essential"],
  [/myeongdong|hongdae|gangnam|seongsu|insadong|itaewon|daiso|neighborhood|where to (go|shop)/i, "local_place"],
  [/buldak|banana milk|snack|ramen|\bgift|brand|product/i, "product"],
];
const INTENT_CATEGORY: Record<QuestionIntent, string> = {
  kbeauty: "K-Beauty",
  shopping: "Shopping Apps & Stores",
  travel_essential: "Travel Essentials",
  local_place: "Local Shopping Places",
  product: "Korean Brands & Products",
  other: "",
};

export function guessIntent(q: string): QuestionIntent {
  for (const [re, intent] of INTENT_RULES) if (re.test(q)) return intent;
  return "other";
}
function normalize(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s?]/g, "").trim();
}
function makeToken(): string {
  return crypto.randomBytes(24).toString("base64url"); // 32 chars, URL-safe, unguessable
}
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex");
}

// ── 스팸/검증(로그인 없는 폼이라 최소 보호) ──
export function validateSubmission(input: { question?: string; website?: string }): { ok: boolean; reason?: string } {
  if ((input.website || "").trim()) return { ok: false, reason: "spam" }; // honeypot filled = bot
  const q = (input.question || "").trim();
  if (q.length < 2) return { ok: false, reason: "too_short" }; // 빈/한글자만 차단, 그 외엔 통과
  if (q.length > 1000) return { ok: false, reason: "too_long" };
  if ((q.match(/https?:\/\//gi) || []).length > 2) return { ok: false, reason: "too_many_links" };
  return { ok: true };
}

// ── Supabase REST (PostgREST) ──
async function sbInsert(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(`${SB_URL}/rest/v1/questions`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`supabase insert ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = (await r.json()) as Record<string, unknown>[];
  return data[0] || {}; // display_id 는 trigger 가 채워서 돌려줌
}

async function sbCountRecentByIp(ipHash: string, sinceIso: string): Promise<number> {
  const qs = new URLSearchParams({ ip_hash: `eq.${ipHash}`, created_at: `gt.${sinceIso}`, select: "id" });
  const r = await fetch(`${SB_URL}/rest/v1/questions?${qs}`, { headers: sbHeaders({ Prefer: "count=exact", Range: "0-0" }) });
  const cr = r.headers.get("content-range") || "";
  const total = cr.includes("/") ? parseInt(cr.split("/")[1] || "0", 10) : 0;
  return Number.isNaN(total) ? 0 : total;
}

async function sbSelectByToken(token: string): Promise<Record<string, string> | null> {
  // full = Ask 컬럼 포함. 아직 SQL 재실행 전이면 그 컬럼이 없어 실패 → core 로 폴백(페이지 안 깨짐).
  const full = "question,status,category_guess,published_url,answer_summary,created_at,display_id,is_public,public_slug";
  const core = "question,status,category_guess,published_url,answer_summary,created_at,display_id";
  for (const sel of [full, core]) {
    const qs = new URLSearchParams({ public_token: `eq.${token}`, select: sel, limit: "1" });
    const r = await fetch(`${SB_URL}/rest/v1/questions?${qs}`, { headers: sbHeaders() });
    if (r.ok) {
      const data = (await r.json()) as Record<string, string>[];
      return data[0] || null;
    }
  }
  return null;
}

// ── 공개 API(호출부가 쓰는 것) ──
export async function createQuestion(
  input: CreateQuestionInput,
): Promise<{ publicToken: string; statusPath: string; displayId: string }> {
  if (!isConfigured()) throw new NotConfiguredError();
  const ipHash = input.ip ? hashIp(input.ip) : null;
  if (ipHash) {
    const since = new Date(Date.now() - 60_000).toISOString();
    if ((await sbCountRecentByIp(ipHash, since)) >= 5) throw new RateLimitError();
  }
  const token = makeToken();
  const intent = guessIntent(input.question);
  const inserted = await sbInsert({
    question: input.question.trim(),
    normalized_question: normalize(input.question),
    language: input.language || "en",
    category_guess: input.categoryGuess || INTENT_CATEGORY[intent] || null,
    intent_guess: intent,
    email: input.email?.trim() || null,
    name: input.name?.trim() || null,
    source_page: input.sourcePage || null,
    source_component: input.sourceComponent || "home_search",
    status: "new",
    priority: "normal",
    public_token: token,
    notify_on_answer: Boolean(input.email?.trim() && input.notifyOnAnswer),
    notification_status: "none",
    ip_hash: ipHash,
  });
  return {
    publicToken: token,
    statusPath: `/ask/submitted/${token}`,
    displayId: (inserted.display_id as string) || "",
  };
}

// 진단(키/데이터 노출 없음) — /api/ask GET 가 호출. 설정/연결/테이블 상태만 안전하게 보고.
export async function diagnose(): Promise<{ configured: boolean; ok: boolean; status?: number; hint: string }> {
  if (!isConfigured()) {
    return {
      configured: false,
      ok: false,
      hint: "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set on this deployment. Add them in Vercel → Settings → Environment Variables, then Redeploy.",
    };
  }
  try {
    const r = await fetch(`${SB_URL}/rest/v1/questions?select=id&limit=1`, { headers: sbHeaders() });
    if (r.ok) return { configured: true, ok: true, status: 200, hint: "Supabase connected and the questions table is reachable — submissions should work." };
    if (r.status === 401 || r.status === 403)
      return { configured: true, ok: false, status: r.status, hint: "Auth failed — you likely pasted the anon/public key. Use the service_role key (Supabase → Settings → API → service_role)." };
    if (r.status === 404)
      return { configured: true, ok: false, status: r.status, hint: "questions table not found — run supabase/questions.sql in the Supabase SQL Editor." };
    return { configured: true, ok: false, status: r.status, hint: `Supabase returned ${r.status}. Check SUPABASE_URL and that the SQL ran.` };
  } catch {
    return { configured: true, ok: false, hint: "Could not reach Supabase. SUPABASE_URL must be the Project URL from Settings → API (https://xxxx.supabase.co) — not the dashboard link, not the postgres connection string. Check for typos/spaces, then Redeploy." };
  }
}

export async function getPublicQuestion(token: string): Promise<PublicQuestionView | null> {
  if (!isConfigured() || !token) return null;
  const row = await sbSelectByToken(token);
  if (!row) return null;
  return {
    question: row.question,
    status: row.status,
    categoryGuess: row.category_guess || undefined,
    createdAt: row.created_at,
    publishedUrl: row.published_url || undefined,
    answerSummary: row.answer_summary || undefined,
    displayId: row.display_id || undefined,
    isPublic: row.is_public === "true" || (row.is_public as unknown) === true,
    publicSlug: row.public_slug || undefined,
  };
}

// ── 공개 Ask 커뮤니티 (목록 / 상세 / Good / 댓글) ──────────────────────────
async function sbReq(
  method: string,
  path: string,
  params?: Record<string, string>,
  body?: unknown,
  extra?: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: unknown; range: string | null }> {
  let url = `${SB_URL}/rest/v1/${path}`;
  if (params) url += "?" + new URLSearchParams(params).toString();
  const r = await fetch(url, {
    method,
    headers: sbHeaders(extra),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: r.ok, status: r.status, data, range: r.headers.get("content-range") };
}

const PUBLIC_SELECT =
  "id,public_slug,public_title,daebak_verdict,public_summary,good_count,comment_count,published_at,related_guides";

function toPublicAsk(row: Record<string, unknown>): PublicAsk {
  const rg = row.related_guides;
  return {
    slug: String(row.public_slug),
    title: (row.public_title as string) || "Daebak question",
    verdict: (row.daebak_verdict as string) || undefined,
    summary: (row.public_summary as string) || undefined,
    goodCount: Number(row.good_count) || 0,
    commentCount: Number(row.comment_count) || 0,
    publishedAt: (row.published_at as string) || undefined,
    relatedGuides: Array.isArray(rg) ? (rg as RelatedGuide[]) : undefined,
  };
}

function visitorHash(ip: string | null | undefined, vid?: string): string {
  return crypto.createHash("sha256").update(`${IP_SALT}:${ip || "noip"}:${vid || ""}`).digest("hex");
}

export async function getPublicAsks(sort: "good" | "latest" = "good", limit = 60): Promise<PublicAsk[]> {
  if (!isConfigured()) return [];
  const order = sort === "latest" ? "published_at.desc" : "good_count.desc,published_at.desc";
  const { ok, data } = await sbReq("GET", "questions", {
    is_public: "eq.true",
    select: PUBLIC_SELECT,
    order,
    limit: String(limit),
  });
  if (!ok || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).filter((r) => r.public_slug).map(toPublicAsk);
}

export async function getPublicAskBySlug(slug: string): Promise<(PublicAsk & { id: string }) | null> {
  if (!isConfigured() || !slug) return null;
  const { ok, data } = await sbReq("GET", "questions", {
    public_slug: `eq.${slug}`,
    is_public: "eq.true",
    select: PUBLIC_SELECT,
    limit: "1",
  });
  if (!ok || !Array.isArray(data) || !data[0]) return null;
  const row = data[0] as Record<string, unknown>;
  return { ...toPublicAsk(row), id: String(row.id) };
}

export async function addGood(slug: string, ip: string | null, vid?: string): Promise<"added" | "already" | "notfound"> {
  if (!isConfigured()) return "notfound";
  const ask = await getPublicAskBySlug(slug);
  if (!ask) return "notfound";
  const { ok, status } = await sbReq(
    "POST",
    "ask_goods",
    undefined,
    { question_id: ask.id, visitor_hash: visitorHash(ip, vid) },
    { Prefer: "return=minimal" },
  );
  if (ok) return "added";
  return status === 409 ? "already" : "already"; // 중복(409)/기타 실패 모두 사용자에겐 에러 안 냄
}

export function validateComment(input: { comment?: string; website?: string }): { ok: boolean; reason?: string } {
  if ((input.website || "").trim()) return { ok: false, reason: "spam" };
  const c = (input.comment || "").trim();
  if (c.length < 1) return { ok: false, reason: "empty" };
  if (c.length > 500) return { ok: false, reason: "too_long" };
  if ((c.match(/https?:\/\//gi) || []).length > 1) return { ok: false, reason: "too_many_links" };
  return { ok: true };
}

export async function listComments(slug: string, limit = 100): Promise<AskComment[]> {
  if (!isConfigured()) return [];
  const ask = await getPublicAskBySlug(slug);
  if (!ask) return [];
  const { ok, data } = await sbReq("GET", "ask_comments", {
    question_id: `eq.${ask.id}`,
    status: "eq.visible",
    select: "id,nickname,comment,created_at",
    order: "created_at.desc",
    limit: String(limit),
  });
  if (!ok || !Array.isArray(data)) return [];
  return (data as Record<string, string>[]).map((r) => ({
    id: r.id,
    nickname: r.nickname || undefined,
    comment: r.comment,
    createdAt: r.created_at,
  }));
}

export async function addComment(
  slug: string,
  input: { nickname?: string; comment: string; website?: string },
  ip: string | null,
  vid?: string,
): Promise<"added" | "notfound" | "invalid" | "rate_limited"> {
  if (!isConfigured()) return "notfound";
  const v = validateComment(input);
  if (!v.ok) return v.reason === "spam" ? "added" : "invalid"; // honeypot → 성공한 척
  const ask = await getPublicAskBySlug(slug);
  if (!ask) return "notfound";
  const vh = visitorHash(ip, vid);
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const cnt = await sbReq(
    "GET",
    "ask_comments",
    { visitor_hash: `eq.${vh}`, created_at: `gt.${since}`, select: "id" },
    undefined,
    { Prefer: "count=exact", Range: "0-0" },
  );
  const total = cnt.range && cnt.range.includes("/") ? parseInt(cnt.range.split("/")[1] || "0", 10) : 0;
  if (total >= 5) return "rate_limited";
  const { ok } = await sbReq(
    "POST",
    "ask_comments",
    undefined,
    {
      question_id: ask.id,
      nickname: (input.nickname || "").trim().slice(0, 40) || null,
      comment: input.comment.trim(),
      visitor_hash: vh,
      status: "visible",
    },
    { Prefer: "return=minimal" },
  );
  return ok ? "added" : "notfound";
}
