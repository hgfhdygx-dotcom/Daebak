// 사이트 단일 설정. 배포 시 Vercel 환경변수로 오버라이드 가능.
//   NEXT_PUBLIC_SITE_URL = 배포된 주소(예: https://my-answers.vercel.app)
//   NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_AUTHOR_NAME = 표시 이름
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Daebak";

export const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME || "Editorial Team";

export const SITE_TAGLINE =
  "Researched, source-cited answers for foreigners in Korea.";
