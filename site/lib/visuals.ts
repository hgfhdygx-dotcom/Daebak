// 승인된 Unsplash 이미지(= admin Image Manager 에서 Apply 한 것)를 읽는 단일 소스.
// site/content/visuals.json 을 빌드 시 읽어, bigCategory/cluster/hero 대표 비주얼을 hotlink 로 표시.
// Unsplash API Guidelines:
//   · HOTLINK — Unsplash 가 준 photo.urls(regular/small) 를 그대로 src 로 사용(로컬 저장 X).
//   · ATTRIBUTION — photographer + Unsplash 링크 + UTM 을 사진 근처에 표시(컴포넌트가 Attribution 으로 렌더).
//   · ACCESS KEY 는 admin 서버 전용 — 이 파일/사이트 어디에도 키가 없음(공개 메타데이터만 읽음).
import fs from "node:fs";
import path from "node:path";

export type ApprovedVisual = {
  url: string; // hotlink (Unsplash photo.urls.regular)
  urlSmall?: string;
  alt: string;
  photographerName: string;
  photographerUrl: string; // UTM 포함
  sourceUrl: string; // UTM 포함 (Unsplash photo page)
  unsplashId?: string;
  width?: number;
  height?: number;
};

export type TargetType = "bigCategory" | "cluster" | "hero";

const FILE = path.join(process.cwd(), "content", "visuals.json");

let _cache: Record<string, RawVisual> | null = null;

type RawVisual = {
  url?: string;
  urlSmall?: string;
  alt?: string;
  photographerName?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  unsplashId?: string;
  width?: number;
  height?: number;
};

function load(): Record<string, RawVisual> {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<string, RawVisual>;
  } catch {
    _cache = {};
  }
  return _cache;
}

// Unsplash 가이드라인: photographer/Unsplash 링크에 ?utm_source=daebak&utm_medium=referral 추가.
function withUtm(u: string): string {
  if (!u) return "https://unsplash.com/?utm_source=daebak&utm_medium=referral";
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}utm_source=daebak&utm_medium=referral`;
}

export function getApprovedVisual(targetType: TargetType, targetKey?: string): ApprovedVisual | null {
  if (!targetKey) return null;
  const v = load()[`${targetType}:${targetKey}`];
  if (!v || !v.url) return null;
  return {
    url: v.url,
    urlSmall: v.urlSmall,
    alt: v.alt || "Korea travel photo on Unsplash",
    photographerName: v.photographerName || "Unsplash",
    photographerUrl: withUtm(v.photographerUrl || "https://unsplash.com"),
    sourceUrl: withUtm(v.sourceUrl || "https://unsplash.com"),
    unsplashId: v.unsplashId,
    width: v.width,
    height: v.height,
  };
}

// 사이트 어디든 Unsplash 사진이 하나라도 쓰였는지(About/footer 크레딧 문구 노출 판단용).
export function hasAnyApprovedVisual(): boolean {
  const store = load();
  return Object.values(store).some((v) => !!v.url);
}
