// 시각 토큰 + 큐레이션 데이터(사이트 전용 — 파이썬 미사용). taxonomy.json(콘텐츠)과 분리.
import type { CatKind } from "@/components/CategoryIcon";

// 카테고리 slug → 카드/허브 배경 tint (기존 홈 팔레트 유지)
export const CATEGORY_TINT: Record<string, string> = {
  travel: "#F4F7FF",
  food: "#FCF9EE",
  "k-beauty": "#FCF4F7",
  "k-fashion": "#F7F4FC",
  shopping: "#FCF5EE",
  "korean-rules": "#F5F4F1",
  "local-places": "#F1F7F3",
  products: "#F1F8F3",
};

// taxonomy 의 icon 이 없을 때 카테고리 기본 아이콘(CategoryIcon kind)
export const CATEGORY_ICON_FALLBACK: Record<string, CatKind> = {
  travel: "travel",
  food: "food",
  "k-beauty": "beauty",
  "k-fashion": "fashion",
  shopping: "shopping",
  "korean-rules": "rules",
  "local-places": "places",
  products: "products",
};

// "Explore by place" 동네 칩 — resolveTopicHref 로 링크(전부 /search?q=). 데이터·범용.
export const PLACES: { label: string; q: string }[] = [
  { label: "Gangnam", q: "Gangnam guide" },
  { label: "Hongdae", q: "Hongdae guide" },
  { label: "Myeongdong", q: "Myeongdong guide" },
  { label: "Seongsu", q: "Seongsu guide" },
  { label: "Itaewon", q: "Itaewon guide" },
  { label: "Insadong", q: "Insadong guide" },
  { label: "Busan", q: "Busan travel" },
  { label: "Jeju", q: "Jeju travel" },
];

// "Explore by need" 목적별 — 실제 Travel 클러스터로 매핑(있으면 cluster page, 없으면 q→/search)
export type NeedItem = { label: string; icon: string; clusterSlug?: string; q?: string };
export const NEEDS: NeedItem[] = [
  { label: "Get from the airport", icon: "plane", clusterSlug: "airport-arrival" },
  { label: "Get around Seoul", icon: "subway", clusterSlug: "seoul-transport" },
  { label: "Stay connected", icon: "sim", clusterSlug: "sim-esim-wifi-apps" },
  { label: "Find where to stay", icon: "bed", clusterSlug: "seoul-stay-neighborhoods" },
  { label: "Plan an itinerary", icon: "calendar", clusterSlug: "korea-itinerary-trip-length" },
  { label: "Travel safely", icon: "shield", clusterSlug: "safety-solo-travel" },
];
