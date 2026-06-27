import Link from "next/link";

// 보이는 브레드크럼 — Home / Category / Cluster / (현재). 마지막 항목은 링크 없음.
export default function Breadcrumb({
  items,
}: {
  items: { name: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted"
    >
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span aria-hidden className="text-line">
              /
            </span>
          ) : null}
          {it.href ? (
            <Link href={it.href} className="transition-colors hover:text-accent-ink">
              {it.name}
            </Link>
          ) : (
            <span className="text-ink">{it.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
