import Link from "next/link";
import SmartThumbnail from "@/components/SmartThumbnail";
import LineIcon from "@/components/LineIcon";
import { Chip } from "@/components/Chip";
import type { HomeCategory, Post } from "@/lib/posts";

// 홈 bigCategory 카드(사진 중심·큼). 상단 16:9 사진 + 제목/블러브 + 태그 pill. cluster 카드보다 크고 사진 우위.
export default function CategoryCard({ cat }: { cat: HomeCategory }) {
  const visual = {
    title: cat.title,
    bigCategory: cat.title,
    bigCategorySlug: cat.slug,
    imageKey: cat.visualKey,
  } as Post;

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-within:shadow-card-hover">
      <Link href={cat.href} aria-label={cat.title} className="block overflow-hidden">
        <SmartThumbnail
          post={visual}
          aspect="16/9"
          level="bigCategory"
          iconKind={cat.icon}
          tint={cat.tint}
          alt={`${cat.title} guides`}
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link href={cat.href} className="block">
          <span className="flex items-center justify-between gap-2 font-display text-base font-bold tracking-tight text-ink transition-colors group-hover:text-accent-ink">
            {cat.title}
            <LineIcon
              name="arrow-right"
              className="h-4 w-4 shrink-0 text-ink-soft transition-all group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{cat.blurb}</span>
        </Link>
        {cat.pills.length ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {cat.pills.slice(0, 3).map((p, i) => (
              <Chip key={i} href={p.href} className="bg-section text-[0.72rem]">
                {p.label}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
