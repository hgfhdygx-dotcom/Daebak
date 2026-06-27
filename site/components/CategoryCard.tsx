import Link from "next/link";
import SmartThumbnail from "@/components/SmartThumbnail";
import { Chip } from "@/components/Chip";
import type { HomeCategory, Post } from "@/lib/posts";

// 홈 카테고리 타일(bigCategory 레벨) — 상단 medium 썸네일(사진 or 흰 패널 폴백) + 제목/blurb + 하위분류 pill.
// 이미지는 taxonomy visualKey 로 자동 매칭(컴포넌트 내 URL 하드코딩 X). 사진 없어도 흰 패널 폴백으로 안 깨짐.
export default function CategoryCard({ cat }: { cat: HomeCategory }) {
  // bigCategory 비주얼용 synthetic post(imageKey=visualKey, 게이팅/폴백 alt 용 bigCategory=title)
  const visual = {
    title: cat.title,
    bigCategory: cat.title,
    bigCategorySlug: cat.slug,
    imageKey: cat.visualKey,
  } as Post;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover focus-within:shadow-card-hover">
      <Link href={cat.href} aria-label={cat.title} className="block">
        <SmartThumbnail
          post={visual}
          aspect="16/9"
          level="bigCategory"
          iconKind={cat.icon}
          tint={cat.tint}
          alt={`${cat.title} guides`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Link href={cat.href} className="block">
          <span className="block font-display text-sm font-semibold tracking-tight text-ink transition-colors group-hover:text-accent-ink">
            {cat.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-muted">{cat.blurb}</span>
        </Link>

        {cat.pills.length ? (
          <>
            {/* 모바일: 최대 3개 상시 */}
            <div className="mt-auto flex flex-wrap gap-1.5 sm:hidden">
              {cat.pills.slice(0, 3).map((p, i) => (
                <Chip key={i} href={p.href} className="bg-section text-[0.7rem]">
                  {p.label}
                </Chip>
              ))}
            </div>
            {/* 데스크탑: hover/focus 시 전체 펼침 */}
            <div className="mt-auto hidden overflow-hidden opacity-0 transition-all duration-200 sm:flex sm:max-h-0 sm:flex-wrap sm:gap-1.5 sm:group-hover:max-h-24 sm:group-hover:opacity-100 sm:group-focus-within:max-h-24 sm:group-focus-within:opacity-100">
              {cat.pills.map((p, i) => (
                <Chip key={i} href={p.href} className="bg-section text-[0.7rem]">
                  {p.label}
                </Chip>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
