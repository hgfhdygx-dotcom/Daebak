// 데이터 기반 카드 인텐트 엔진 — 질문/메타로 카드 상단 라벨과 칩 표시를 결정한다.
// 주제 무관(공항·음식·쇼핑·SIM·숙소…), 하드코딩 금지: post.questionType/pageType/title/highlights/
// atAGlance/sources 만 보고 렌더타임에 계산. 어떤 새 질문이 들어와도 자동 동작.
import type { Post } from "@/lib/posts";

// ── 의도 키워드 규칙(위에서부터 첫 매치). EN + KR 방어적 매칭. ──
export type IntentRule = { label: string; re: RegExp };
export const INTENT_RULES: IntentRule[] = [
  { label: "WORTH IT", re: /\bworth (it|the|a)\b|is it worth|값어치|가치(가| )?있|탈\s*만/i },
  { label: "CHEAPEST", re: /\b(cheapest|cheaper|cheap|budget|low[-\s]?cost|save money)\b|저렴|가성비|최저/i },
  { label: "FASTEST", re: /\b(fastest|quickest)\b|가장\s*빠른|최단\s*시간/i },
  { label: "LATE NIGHT", re: /\b(late[-\s]?night|after midnight|overnight|last train|first train|red[-\s]?eye)\b|심야|새벽|막차|첫차/i },
  { label: "LUGGAGE FRIENDLY", re: /\b(luggage|suitcase|baggage|bags?)\b|짐|캐리어|수하물/i },
  { label: "WATCH OUT", re: /\b(scam|danger|dangerous|avoid|warning|rip[-\s]?off)\b|주의|조심|사기|바가지/i },
];

const _MODE_RE = /\b(train|subway|metro|bus|limousine|taxi|cab|ferry|walk|car|bike|cycle|flight)\b|기차|지하철|버스|택시|리무진/gi;
const _COST_RE = /\b(how much|price|prices|cost|costs|fare|fares|fee|fees|expensive|budget)\b|요금|비용|가격|얼마/i;
const _PRICE_TOKEN = /(₩|\bKRW\b|\bwon\b|US?\$|\$\s?\d|\b\d{1,3}(,\d{3})+\b|\d+\s?원)/i;
const _TIME_TOKEN = /\b\d+\s?(min(ute)?s?|hours?|hrs?|h)\b|\b\d+\s?[-–]\s?\d+\s?min|분\b|시간/i;
const _ACRONYM = /^[A-Z0-9][A-Z0-9.\-]{1,6}$/; // AREX, ICN, KTX, T-money … (목적지 아님)
const _PLACE_STOP = new Set(["korea", "korean", "south korea"]);

function _haystack(post: Post): string {
  return `${post.question || ""} ${post.title || ""} ${post.intent || ""}`.toLowerCase();
}

function _modes(text: string): string[] {
  const m = text.match(_MODE_RE) || [];
  return Array.from(new Set(m.map((s) => s.toLowerCase())));
}

// "… to <Destination>" 에서 도착지 고유명사 추출(범용 — 장소 목록 하드코딩 X). 못 찾으면 "".
function _destination(post: Post): string {
  const raw = post.question || post.title || "";
  const m = raw.match(/\bto\s+([A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+){0,2})/u);
  if (!m) return "";
  const dest = m[1].trim().replace(/[\s,.;:—–-]+$/, "");
  if (!dest) return "";
  const first = dest.split(/\s+/)[0];
  if (_ACRONYM.test(first)) return ""; // 서비스 약어(AREX 등)는 목적지 아님
  if (_PLACE_STOP.has(dest.toLowerCase())) return "";
  return dest;
}

function _modeLabel(text: string): string {
  if (/\btaxi\b|\bcab\b|택시/i.test(text)) return "TAXI";
  if (/\bbus\b|limousine|버스|리무진/i.test(text)) return "BUS OPTION";
  if (/\btrain\b|subway|metro|기차|지하철/i.test(text)) return "TRAIN OPTION";
  return "";
}

/** 카드 상단 라벨(대문자). 데이터만 보고 결정 — 어떤 주제에도 동작. */
export function cardIntent(post: Post): string {
  const text = _haystack(post);
  const isPillar = post.questionType === "pillar" || (post.pillarSlug && post.pillarSlug === post.slug);
  const big = (post.bigCategory || "").trim();

  // 1) FAQ / Pillar 우선
  if (post.questionType === "faq") return "FAQ";
  if (isPillar) return big ? `${big.toUpperCase()} GUIDE` : "MAIN GUIDE";

  // 2) 명확한 의도 키워드
  for (const rule of INTENT_RULES) {
    if (rule.re.test(text)) return rule.label;
  }

  // 3) 비용 + 수단 → "<MODE> COST" / 비용만 → "PRICE"
  if (_COST_RE.test(text)) {
    const ml = _modeLabel(text);
    if (ml === "TAXI") return "TAXI COST";
    if (ml === "BUS OPTION") return "BUS COST";
    return "PRICE";
  }

  // 4) 목적지 질문(다수단 비교거나 route) → "BEST FOR <DEST>"
  const dest = _destination(post);
  const multiMode = _modes(text).length >= 2;
  if (dest && (multiMode || post.pageType === "route")) return `BEST FOR ${dest.toUpperCase()}`;

  // 5) 단일 수단 / 비교
  if (/\s\bvs\b\s|versus|compare/i.test(text) || multiMode) return "COMPARE";
  const single = _modeLabel(text);
  if (single) return single;

  // 6) pageType → 카테고리 라벨
  const byType: Record<string, string> = {
    comparison: "COMPARE", price: "PRICE", safety: "WATCH OUT",
    planning: "PLAN", list: "TOP PICKS", visa: "VISA",
  };
  if (post.pageType && byType[post.pageType]) return byType[post.pageType];

  // 7) 폴백
  return big ? `${big.toUpperCase()} GUIDE` : "GENERAL GUIDE";
}

// ── 칩 표시 헬퍼(데이터 없으면 가짜 숫자 만들지 않음 — 규칙8) ──
function _glanceValues(post: Post): string {
  const hl = (post.highlights || []).join(" ");
  const ag = (post.atAGlance || []).map((g) => g.value).join(" ");
  const kf = (post.citationPack?.keyFacts || []).join(" ");
  return `${hl} ${ag} ${kf}`;
}

export function hasPrice(post: Post): boolean {
  return _PRICE_TOKEN.test(_glanceValues(post));
}

export function hasTime(post: Post): boolean {
  return _TIME_TOKEN.test(_glanceValues(post));
}

/** 출처 칩: 공식 출처 있으면 강조(trust), 있으면 일반, 없으면 'Source needed'. */
export function sourceTone(post: Post): { tone: "trust" | "muted"; text: string } | null {
  const srcs = post.sources || [];
  if (srcs.some((s) => /official/i.test(s.note || ""))) {
    return { tone: "trust", text: "Official sources" };
  }
  if (srcs.length > 0) return { tone: "muted", text: "Sources" };
  return { tone: "muted", text: "Source needed" };
}

/** highlights 중 숫자(가격/시간) 배지만, 의도에 맞게 정렬해서 최대 n개. pillar 는 숫자 배지 숨김(호출부에서). */
export function numericHighlights(post: Post, intent: string, n = 2): string[] {
  const hl = (post.highlights || []).map((h) => String(h).trim()).filter(Boolean);
  const priceFirst = /COST|CHEAPEST|PRICE/.test(intent);
  const timeFirst = /FASTEST/.test(intent);
  const score = (h: string) => {
    const p = _PRICE_TOKEN.test(h), t = _TIME_TOKEN.test(h);
    if (priceFirst) return p ? 0 : t ? 1 : 2;
    if (timeFirst) return t ? 0 : p ? 1 : 2;
    return 0;
  };
  return [...hl].sort((a, b) => score(a) - score(b)).slice(0, n);
}
