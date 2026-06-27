import Link from "next/link";
import type { ReactNode } from "react";

// 공용 pill/chip. href 있으면 링크(+hover 강조), 없으면 정적 정보 태그(hover 효과 없음 → 클릭 기대 차단, R3).
export function Chip({
  href,
  children,
  className = "",
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-muted ";
  if (href) {
    return (
      <Link href={href} className={base + "transition-colors hover:border-accent hover:text-accent-ink " + className}>
        {children}
      </Link>
    );
  }
  return <span className={base + className}>{children}</span>;
}

// 칩 묶음 — 칩 렌더 지점 통일(N1). scroll=true 면 모바일 가로스크롤, sm+ 부터 wrap.
export function ChipList({
  children,
  scroll = false,
  className = "",
}: {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
}) {
  const cls = scroll
    ? "flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible "
    : "flex flex-wrap gap-2 ";
  return <div className={cls + className}>{children}</div>;
}

export default Chip;
