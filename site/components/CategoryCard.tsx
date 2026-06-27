import Link from "next/link";
import CategoryIcon, { type CatKind } from "@/components/CategoryIcon";
import { Chip } from "@/components/Chip";
import type { HomeCategory } from "@/lib/posts";

// 홈 "Browse by category" 카드 — hover/focus 시 하위분류 pill 펼침(모바일은 상시). 데이터 기반.
export default function CategoryCard({ cat }: { cat: HomeCategory }) {
  return (
    <div
      style={{ backgroundColor: cat.tint }}
      className="group flex flex-col gap-2.5 rounded-2xl border border-line p-4 transition-shadow hover:shadow-sm focus-within:shadow-sm"
    >
      <Link href={cat.href} className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted">
          <CategoryIcon kind={cat.icon as CatKind} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-sm font-semibold tracking-tight text-ink transition-colors group-hover:text-accent-ink">
            {cat.title}
          </span>
          <span className="block truncate text-xs text-ink-muted">{cat.blurb}</span>
        </span>
      </Link>

      {cat.pills.length ? (
        <>
          {/* 모바일: 최대 3개만 상시 노출 */}
          <div className="flex flex-wrap gap-1.5 sm:hidden">
            {cat.pills.slice(0, 3).map((p, i) => (
              <Chip key={i} href={p.href} className="bg-white/70 text-[0.7rem]">
                {p.label}
              </Chip>
            ))}
          </div>
          {/* 데스크탑: hover/focus 시 전체 펼침 */}
          <div className="hidden overflow-hidden opacity-0 transition-all duration-200 sm:flex sm:max-h-0 sm:flex-wrap sm:gap-1.5 sm:group-hover:max-h-24 sm:group-hover:opacity-100 sm:group-focus-within:max-h-24 sm:group-focus-within:opacity-100">
            {cat.pills.map((p, i) => (
              <Chip key={i} href={p.href} className="bg-white/70 text-[0.7rem]">
                {p.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
