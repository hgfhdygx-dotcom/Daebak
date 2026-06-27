import Link from "next/link";
import type { ReactNode } from "react";

// 공용 pill/chip. href 있으면 링크, 없으면 정적. 모든 칩의 단일 소스.
export function Chip({
  href,
  children,
  className = "",
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const cls =
    "inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-muted transition-colors hover:border-accent hover:text-accent-ink " +
    className;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export default Chip;
