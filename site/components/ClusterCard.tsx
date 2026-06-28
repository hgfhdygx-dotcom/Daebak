import Link from "next/link";
import SmartThumbnail from "@/components/SmartThumbnail";
import StatusBadge from "@/components/StatusBadge";
import LineIcon from "@/components/LineIcon";
import { Chip } from "@/components/Chip";
import { createShortQuestionLabel } from "@/lib/cardIntent";
import { categoryTone, type Cluster, type Post } from "@/lib/posts";

// 라이브 클러스터 카드(가로형·정보 우위) — 작은 사진 + 상태배지 + 제목 + 질문 pill + CTA.
// bigCategory 카드(사진 중심·큼)와 역할 구분. 대표질문 박스는 제거(상단 FeaturedAnswer 와 중복 방지).
export default function ClusterCard({
  cluster,
  categorySlug,
  counts,
}: {
  cluster: Cluster;
  categorySlug: string;
  counts: { publishedCount: number; draftCount: number };
}) {
  const href = `/${categorySlug}/${cluster.slug}`;
  const live = counts.publishedCount;
  const soon = counts.draftCount;
  const pills = (cluster.supportingQuestions ?? [])
    .slice(0, 3)
    .map((q) => createShortQuestionLabel({ question: q.question }));
  const tint = categoryTone(cluster.bigCategory);
  const visual = {
    title: cluster.title,
    cluster: cluster.title,
    bigCategorySlug: categorySlug,
    clusterSlug: cluster.slug,
    imageKey: cluster.visualKey,
  } as Post;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover sm:flex-row">
      <div className="sm:w-[38%] sm:shrink-0">
        <SmartThumbnail
          post={visual}
          aspect="16/9"
          level="cluster"
          iconKind={cluster.icon}
          tint={tint}
          className="h-full"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent-ink">
            {live > 0 ? "Live topic" : "Topic"}
          </span>
          <StatusBadge live={live} soon={soon} />
        </div>
        <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight text-ink">
          <Link href={href} className="transition-colors after:absolute after:inset-0 group-hover:text-accent-ink">
            {cluster.title}
          </Link>
        </h3>
        {cluster.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {cluster.description}
          </p>
        ) : null}
        {pills.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pills.map((p, i) => (
              <Chip key={i}>{p}</Chip>
            ))}
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
