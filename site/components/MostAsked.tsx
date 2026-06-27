import Link from "next/link";

// Hero 우측 "Most asked now" 카드 — compact(첫 화면을 너무 안 차지하게).
export default function MostAsked({
  items,
  title = "Most asked now",
}: {
  items: { label: string; href: string }[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-ink">
        {title}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {items.map((it, i) => (
          <li key={it.href + i}>
            <Link href={it.href} className="group flex items-center gap-2.5 py-2">
              <span
                aria-hidden
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-[0.7rem] font-bold text-ink-muted"
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium leading-snug text-ink transition-colors group-hover:text-accent-ink">
                {it.label}
              </span>
              <span
                aria-hidden
                className="ml-auto text-ink-muted transition-transform group-hover:translate-x-0.5"
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
