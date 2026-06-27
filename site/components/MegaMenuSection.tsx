import Link from "next/link";
import ClusterIcon from "@/components/ClusterIcon";

export type MegaMenuItem = { label: string; href: string; icon?: string };

// 메가메뉴 한 그룹(=카테고리) — 헤더(아이콘 버블 + 굵은 제목) + 하위 링크 목록. 데이터 기반·재사용.
// 위계: 제목 = 진한·굵게, 하위 = 중간톤·작게. hover/focus = 은은한 배경 + accent 색 + 화살표 힌트. 특정 항목 하드코딩 X.
export default function MegaMenuSection({
  title,
  href,
  icon,
  items,
}: {
  title: string;
  href: string;
  icon: string;
  items: MegaMenuItem[];
}) {
  return (
    <div role="group" aria-label={title}>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-ink transition-colors hover:text-accent-ink focus-visible:bg-accent/[0.06] focus-visible:text-accent-ink focus-visible:outline-none"
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-section text-accent-ink">
          <ClusterIcon kind={icon} className="h-3.5 w-3.5" />
        </span>
        <span className="font-display text-sm font-bold tracking-tight">{title}</span>
      </Link>
      <ul className="mt-0.5 space-y-px">
        {items.map((t, i) => (
          <li key={i}>
            <Link
              href={t.href}
              className="group/link flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[0.82rem] leading-tight text-ink-muted transition-colors hover:bg-accent/[0.06] hover:text-accent-ink focus-visible:bg-accent/[0.06] focus-visible:text-accent-ink focus-visible:outline-none"
            >
              <span className="truncate">{t.label}</span>
              <span
                aria-hidden
                className="shrink-0 -translate-x-1 text-xs opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-60 group-focus-visible/link:translate-x-0 group-focus-visible/link:opacity-60"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
