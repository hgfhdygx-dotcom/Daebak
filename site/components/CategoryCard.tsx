import Link from "next/link";
import CategoryIcon, { type CatKind } from "@/components/CategoryIcon";
import { Chip } from "@/components/Chip";
import type { HomeCategory } from "@/lib/posts";

// 홈 카테고리 타일 — 흰 카드 + 상단 컬러 아이콘 박스(category tone) + hover blue shadow + 하위분류 pill.
// 카테고리 색은 taxonomy tone(아이콘 박스에만), 카드 본체는 흰색. 데이터 기반.
export default function CategoryCard({ cat }: { cat: HomeCategory }) {
  return (
    <div className="group flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover focus-within:shadow-card-hover">
      <Link href={cat.href} className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-accent-ink"
          style={{ backgroundColor: cat.tint }}
        >
          <CategoryIcon kind={cat.icon as CatKind} className="h-[20px] w-[20px]" />
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
          {/* 모바일: 최대 3개 상시 */}
          <div className="flex flex-wrap gap-1.5 sm:hidden">
            {cat.pills.slice(0, 3).map((p, i) => (
              <Chip key={i} href={p.href} className="bg-section text-[0.7rem]">
                {p.label}
              </Chip>
            ))}
          </div>
          {/* 데스크탑: hover/focus 시 전체 펼침 */}
          <div className="hidden overflow-hidden opacity-0 transition-all duration-200 sm:flex sm:max-h-0 sm:flex-wrap sm:gap-1.5 sm:group-hover:max-h-24 sm:group-hover:opacity-100 sm:group-focus-within:max-h-24 sm:group-focus-within:opacity-100">
            {cat.pills.map((p, i) => (
              <Chip key={i} href={p.href} className="bg-section text-[0.7rem]">
                {p.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
