import SmartThumbnail from "@/components/SmartThumbnail";
import Attribution from "@/components/Attribution";
import { getApprovedVisual } from "@/lib/visuals";
import type { Post } from "@/lib/posts";

// 카테고리 허브 Hero — LABEL + heroTitle + subtitle + stats(live/soon/topics) + 우측 compact 비주얼(bigCategory 레벨).
// 우측 비주얼은 visualKey 자동 매칭(사진 or 흰 패널 폴백). 거대 박스 금지 — compact medium 썸네일만.
export default function CategoryHero({
  label,
  title,
  subtitle,
  stats,
  icon,
  tint,
  visualKey,
  categorySlug,
}: {
  label: string;
  title: string;
  subtitle?: string;
  stats: { live: number; soon: number; topics: number };
  icon: string;
  tint: string;
  visualKey?: string;
  categorySlug?: string;
}) {
  const visual = {
    title,
    bigCategorySlug: categorySlug,
  } as Post;
  const approved = getApprovedVisual("bigCategory", categorySlug); // 승인된 Unsplash 사진(있으면 hotlink)

  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface to-section px-5 py-7 sm:px-8 sm:py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full opacity-[0.08]"
        style={{ backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "15px 15px", color: "var(--color-accent)" }}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">{label}</p>
          <h1 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.1] tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-base leading-relaxed text-ink-muted">{subtitle}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span>
              <b className="text-ink">{stats.live}</b> guides
            </span>
            <span>
              <b className="text-ink">{stats.soon}</b> coming soon
            </span>
            <span>
              <b className="text-ink">{stats.topics}</b> topics
            </span>
          </div>
        </div>

        {/* 우측 compact 비주얼 — 모바일은 숨김(텍스트 우선), 데스크탑만 */}
        <div className="relative hidden w-44 shrink-0 overflow-hidden rounded-2xl border border-line shadow-card sm:block lg:w-52">
          <SmartThumbnail
            post={visual}
            visual={approved}
            aspect="4/3"
            level="bigCategory"
            iconKind={icon}
            tint={tint}
          />
          {approved ? <Attribution visual={approved} className="absolute bottom-1.5 right-1.5 z-10" /> : null}
        </div>
      </div>
    </section>
  );
}
