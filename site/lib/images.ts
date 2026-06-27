// 문맥 기반 이미지 시스템 (GEO 자산). 컴포넌트는 절대 이미지 URL 을 직접 들지 않고 이 레지스트리만 통한다.
// 사진은 /public/images/travel/ 에 있을 때만 사용(점수≥80 & 파일 존재). 그 외엔 폴백(흰 패널 + 아이콘).
// 외부 랜덤 URL 금지. 자동 생성 글도 같은 규칙(키워드+카테고리/클러스터/pageType 게이팅)으로 자동 선택.
//
// ▣ 인물 금지 규칙 (이미지 프롬프트/선택의 기본 규칙): "no people, no faces, no human subjects".
//   금지 = 사람 얼굴 · 인물 중심 · 군중 · 모델 · 셀카/패션샷 · 여행자 인물컷 · 광고형 인물.
//   허용 = 공항 내부 · AREX/지하철/버스/택시 외관 · 서울 스카이라인 · 거리/동네 풍경 · 교통수단 ·
//          카드/티머니 등 결제 오브젝트 · 사람 없는 장소 풍경 · 아이콘/벡터 폴백.
//   레지스트리에 새 이미지를 추가할 때도 위 규칙을 지킬 것(아래 항목은 전부 장소/사물형).
import fs from "node:fs";
import path from "node:path";
import { cardIcon } from "@/lib/cardIntent";
import { SITE_URL } from "@/lib/site";
import type { Post } from "@/lib/posts";

export type RegistryImage = {
  src: string; // /public 기준 경로, 예: "images/travel/incheon-airport.jpg" (영어 키워드 파일명)
  alt: string; // 구체적 영어 alt (필수)
  caption: string; // 영어 caption
  tags: string[];
  allowedCategories?: string[]; // bigCategory 제목(비면 제한 없음)
  allowedClusters?: string[]; // cluster 제목
  allowedPageTypes?: string[];
  license?: string; // 선택: 출처 추적
  credit?: string;
};

// v1 핵심 키 몇 개(파일은 운영자가 넣기 전까지 없음 → 폴백). 영어 파일명·구체 alt/caption.
export const imageRegistry: Record<string, RegistryImage> = {
  "incheon-airport": {
    src: "images/travel/incheon-airport-arrival.jpg",
    alt: "Incheon Airport arrival hall in South Korea",
    caption: "Incheon Airport is the main arrival point for most first-time visitors to Seoul.",
    tags: ["airport", "incheon", "icn", "arrival", "terminal", "immigration", "departure", "seoul"],
    allowedCategories: ["Travel"], allowedClusters: ["Airport & Arrival"],
    allowedPageTypes: ["route", "practical", "price", "comparison"],
  },
  "arex-train": {
    src: "images/travel/arex-train-seoul.jpg",
    alt: "AREX express train between Incheon Airport and Seoul Station",
    caption: "AREX connects Incheon Airport with Seoul Station and is often the fastest airport rail option.",
    tags: ["arex", "train", "airport", "express", "rail", "station", "all-stop", "ktx"],
    allowedCategories: ["Travel"], allowedClusters: ["Airport & Arrival", "Seoul Transport"],
    allowedPageTypes: ["route", "comparison", "practical"],
  },
  "airport-taxi": {
    src: "images/travel/incheon-airport-taxi.jpg",
    alt: "Taxi stand outside Incheon Airport near Seoul",
    caption: "Airport taxis run around the clock and are easiest with luggage, though pricier than the train.",
    tags: ["taxi", "cab", "airport", "incheon", "fare", "luggage", "late", "night"],
    allowedCategories: ["Travel"], allowedClusters: ["Airport & Arrival"],
    allowedPageTypes: ["price", "route", "practical"],
  },
  "airport-bus": {
    src: "images/travel/incheon-airport-limousine-bus.jpg",
    alt: "Airport limousine bus bound for Seoul hotels",
    caption: "Airport limousine buses reach many hotels directly and have plenty of luggage space.",
    tags: ["bus", "limousine", "airport", "incheon", "hotel", "shuttle"],
    allowedCategories: ["Travel"], allowedClusters: ["Airport & Arrival"],
    allowedPageTypes: ["route", "comparison", "price"],
  },
  "seoul-subway": {
    src: "images/travel/seoul-subway-platform.jpg",
    alt: "Seoul subway platform with an arriving metro train",
    caption: "Seoul's subway is usually the easiest way to get around the city.",
    tags: ["subway", "metro", "train", "seoul", "transport", "line", "platform"],
    allowedCategories: ["Travel"], allowedClusters: ["Seoul Transport", "T-money, WOWPASS & Payments"],
    allowedPageTypes: ["practical", "comparison", "route"],
  },
  "tmoney-card": {
    src: "images/travel/tmoney-card-subway-gate.jpg",
    alt: "T-money transit card tapped at a Seoul subway gate",
    caption: "T-money is a rechargeable card for subways, buses, and convenience stores.",
    tags: ["tmoney", "wowpass", "card", "transit", "payment", "gate", "subway"],
    allowedCategories: ["Travel"], allowedClusters: ["T-money, WOWPASS & Payments", "Seoul Transport"],
    allowedPageTypes: ["practical"],
  },
  "myeongdong-street": {
    src: "images/travel/myeongdong-shopping-street.jpg",
    alt: "Myeongdong shopping street in central Seoul",
    caption: "Myeongdong is a popular first-stay area for shopping, food, and easy subway access.",
    tags: ["myeongdong", "shopping", "seoul", "neighborhood", "stay", "street", "hotel"],
    allowedCategories: ["Travel", "Shopping", "Food"], allowedClusters: ["Seoul Stay & Neighborhoods"],
    allowedPageTypes: ["place", "planning", "list", "practical"],
  },
  "seoul-skyline": {
    src: "images/travel/seoul-skyline-view.jpg",
    alt: "Seoul city skyline with N Seoul Tower",
    caption: "Seoul blends modern districts with palaces, rivers, and mountains.",
    tags: ["seoul", "skyline", "city", "tower", "view", "korea", "travel", "hangang", "river"],
    allowedCategories: ["Travel", "Local Places"],
    allowedPageTypes: ["place", "planning", "list", "practical"],
  },
};

const _STOP = new Set([
  "the", "a", "an", "to", "from", "in", "of", "for", "is", "how", "do", "i", "what", "much",
  "at", "on", "and", "or", "my", "your", "you", "with", "it", "be", "are", "can", "get", "should",
  "this", "that", "best", "vs", "use", "need", "when", "where", "which", "korea", "korean",
]);
function _kw(s?: string): string[] {
  return (String(s || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !_STOP.has(w));
}

export function imageFileExists(src: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", src.replace(/^\//, "")));
  } catch {
    return false;
  }
}

export function publicImageUrl(src: string): string {
  return `${(SITE_URL || "").replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
}

export type ThumbResult = {
  mode: "photo" | "illustration";
  image?: RegistryImage;
  iconKind: string;
  alt: string;
  caption?: string;
};

// post 문맥(제목/질문/요약/장소/경로 + 카테고리/클러스터/pageType)으로 가장 관련도 높은 이미지 선택.
// 점수≥80 & 파일 존재 → photo. 그 외 → illustration(폴백). 게이팅으로 '엉뚱한 이미지' 차단.
export function pickImage(post: Post): ThumbResult {
  const iconKind = cardIcon(post);
  const fallbackAlt = `${post.cluster || post.bigCategory || "Korea travel"} guide illustration`;

  // 명시 imageKey 우선(자동 생성 글이 지정한 경우)
  const explicit = post.imageKey ? imageRegistry[post.imageKey] : undefined;
  if (explicit) {
    return imageFileExists(explicit.src)
      ? { mode: "photo", image: explicit, iconKind, alt: explicit.alt, caption: explicit.caption }
      : { mode: "illustration", iconKind, alt: explicit.alt };
  }

  const cat = (post.bigCategory || "").toLowerCase();
  const cl = (post.cluster || "").toLowerCase();
  const pt = (post.pageType || "").toLowerCase();
  const words = new Set<string>([
    ..._kw(post.title), ..._kw(post.question), ..._kw(post.summary),
    ..._kw(post.place), ...(post.route || []).flatMap(_kw),
  ]);

  let best: { img: RegistryImage; score: number } | null = null;
  for (const img of Object.values(imageRegistry)) {
    if (img.allowedCategories?.length && !img.allowedCategories.some((c) => c.toLowerCase() === cat)) continue;
    if (img.allowedClusters?.length && !img.allowedClusters.some((c) => c.toLowerCase() === cl)) continue;
    if (img.allowedPageTypes?.length && pt && !img.allowedPageTypes.includes(pt)) continue;
    const hits = img.tags.reduce((n, t) => {
      const tl = t.toLowerCase();
      return n + ([...words].some((w) => w === tl || tl.includes(w) || w.includes(tl)) ? 1 : 0);
    }, 0);
    const tagScore = img.tags.length ? (hits / Math.min(img.tags.length, 4)) * 100 : 0;
    const clusterBonus = cl && img.allowedClusters?.some((c) => c.toLowerCase() === cl) ? 20 : 0;
    const catBonus = cat && img.allowedCategories?.some((c) => c.toLowerCase() === cat) ? 5 : 0;
    const score = Math.min(100, Math.round(tagScore + clusterBonus + catBonus));
    if (!best || score > best.score) best = { img, score };
  }

  if (best && best.score >= 80 && imageFileExists(best.img.src)) {
    return { mode: "photo", image: best.img, iconKind, alt: best.img.alt, caption: best.img.caption };
  }
  return { mode: "illustration", iconKind, alt: fallbackAlt };
}

// 실제 사진(고관련도 + 파일 존재)이 있는지. article 카드가 '썸네일 vs 작은 아이콘 배지'를 결정할 때 사용.
export function hasPhoto(post: Post): boolean {
  return pickImage(post).mode === "photo";
}
