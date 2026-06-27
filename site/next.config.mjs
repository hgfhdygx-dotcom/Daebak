/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router는 기본 SSR — AI 크롤러가 JS 실행 없이도 본문을 읽을 수 있음(전제 2 충족).
  reactStrictMode: true,
  // 이미지 최적화: 가벼운 포맷 우선(성능=GEO). 로컬 /public 이미지라 remotePatterns 불필요.
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
