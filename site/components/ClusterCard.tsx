import Link from "next/link";
import SmartThumbnail from "@/components/SmartThumbnail";
import Attribution from "@/components/Attribution";
import StatusBadge from "@/components/StatusBadge";
import LineIcon from "@/components/LineIcon";
import { getApprovedVisual } from "@/lib/visuals";
import { categoryTone, type Cluster, type Post } from "@/lib/posts";

// 클러스터 카드(2~3열 그리드용) — 상단 짧은 배너 사진(max-h 캡 → 정보보다 크지 않게) + 상태배지 +
// 제목 + 설명 + 대표/예정 가이드 1줄. 사진 crop/높이 통일. bigCategory(사진 중심·큼)와 역할 구분(정보 우위).
export default function ClusterCard({
  cluster,
  categorySlug,
  counts,
  featuredQuestion,
}: {
  cluster: Cluster;
  categorySlug: string;
  counts: { publishedCount: number; draftCount: number };
  featuredQuestion?: string;
}) {
  const href = `/${categorySlug}/${cluster.slug}`;
  const live = counts.publishedCount;
  const soon = counts.draftCount;
  const tint = categoryTone(cluster.bigCategory);
  const visual = {
    title: cluster.title,
    cluster: cluster.title,
    bigCategorySlug: categorySlug,
    clusterSlug: cluster.slug,
  } as Post;
  const approved = getApprovedVisual("cluster", cluster.slug); // 승인된 Unsplash 사진(있으면 hotlink)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover">
      {/* 짧은 배너(캡) — 사진이 정보보다 커지지 않게. attribution 은 stretched 링크 위(z-10) overlay */}
      <div className="relative">
        <SmartThumbnail
          post={visual}
          visual={approved}
          aspect="16/9"
          level="cluster"
          iconKind={cluster.icon}
          tint={tint}
          className="max-h-36"
        />
        {approved ? <Attribution visual={approved} className="absolute bottom-1.5 right-1.5 z-10" /> : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold tracking-tight text-ink">
            <Link href={href} className="transition-colors after:absolute after:inset-0 group-hover:text-accent-ink">
              {cluster.title}
            </Link>
          </h3>
          <StatusBadge live={live} soon={soon} />
        </div>
        {cluster.description ? (
          <p className="mt-1 line-clamp-2 text-[0.82rem] leading-relaxed text-ink-muted">
            {cluster.description}
          </p>
        ) : null}
        {featuredQuestion ? (
          <div className="mt-2.5 rounded-lg bg-section px-3 py-2">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-accent-ink">
              {live > 0 ? "Featured guide" : "Coming soon"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[0.8rem] font-medium leading-snug text-ink">
              {featuredQuestion}
            </p>
          </div>
        ) : null}
        <span className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent-ink">
          {live > 0 ? "Explore" : "Preview"} guides
          <LineIcon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}
