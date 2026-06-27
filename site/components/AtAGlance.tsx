import type { GlanceItem } from "@/lib/posts";

// 맨 위 "3초 선택지" 칩 — 글을 읽기 전에 핵심 선택(Fastest/Cheapest/Late night 등)이 바로 보이게.
export default function AtAGlance({ items }: { items: GlanceItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.slice(0, 4).map((it, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-3.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-accent-ink">
            {it.label}
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-ink">
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}
