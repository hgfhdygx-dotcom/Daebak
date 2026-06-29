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
};

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
  if (q.length < 10) return { ok: false, reason: "too_short" };
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
  const qs = new URLSearchParams({
    public_token: `eq.${token}`,
    select: "question,status,category_guess,published_url,answer_summary,created_at,display_id",
    limit: "1",
  });
  const r = await fetch(`${SB_URL}/rest/v1/questions?${qs}`, { headers: sbHeaders() });
  if (!r.ok) return null;
  const data = (await r.json()) as Record<string, string>[];
  return data[0] || null;
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
    statusPath: `/questions/status/${token}`,
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
  };
}
