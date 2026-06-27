// 사이트 단일 설정. 배포 시 Vercel 환경변수로 오버라이드 가능.
//   NEXT_PUBLIC_SITE_URL = 배포된 주소(예: https://daebak-pi.vercel.app)
//   NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_AUTHOR_NAME = 표시 이름
// ⚠️ 항상 '프로토콜 포함 절대 URL' 로 정규화한다. 환경변수가 "daebak-pi.vercel.app"(프로토콜 없음)처럼
//    들어와도 new URL(SITE_URL)(layout metadataBase)이 'Invalid URL' 로 빌드 실패하지 않도록 보정.
function normalizeSiteUrl(raw?: string): string {
  const v = (raw || "").trim().replace(/\/+$/, "");
  if (!v) return "https://daebak-pi.vercel.app";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Daebak";

export const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME || "Editorial Team";

export const SITE_TAGLINE =
  "A local Korean's guide to Korea for foreigners — clear answers on travel, food, K-beauty, fashion, and shopping, with real prices, times, and trusted sources.";
