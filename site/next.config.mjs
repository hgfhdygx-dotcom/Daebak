/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router는 기본 SSR — AI 크롤러가 JS 실행 없이도 본문을 읽을 수 있음(전제 2 충족).
  reactStrictMode: true,
  // 이미지: 로컬 /public + Unsplash hotlink. Unsplash 사진은 <img> 로 CDN 직접 표시(가이드라인 'hotlink' 준수,
  // 프록시/재호스팅 없음). remotePatterns 는 혹시 next/image 로 쓸 때를 대비해 Unsplash CDN 만 허용.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
