import type { ReactNode } from "react";

// 섹션 배경 밴드 — 페이지에 여행 사이트 같은 리듬을 준다(전체 폭 배경 + 가운데 정렬 컨테이너).
// variant 색은 전역 토큰만. 가독성 위해 강한 색은 쓰지 않음.
const BG: Record<string, string> = {
  white: "bg-surface",
  sky: "bg-section",
  subtle: "bg-bg",
  gradient: "bg-gradient-to-b from-section to-surface",
};

export default function SectionBand({
  variant = "white",
  className = "",
  inner = "",
  id,
  children,
}: {
  variant?: "white" | "sky" | "subtle" | "gradient";
  className?: string;
  inner?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`${BG[variant] || BG.white} ${className}`}>
      <div className={`mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8 ${inner}`}>{children}</div>
    </section>
  );
}
