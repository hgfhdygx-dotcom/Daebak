/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router는 기본 SSR — AI 크롤러가 JS 실행 없이도 본문을 읽을 수 있음(전제 2 충족).
  reactStrictMode: true,
};

export default nextConfig;
