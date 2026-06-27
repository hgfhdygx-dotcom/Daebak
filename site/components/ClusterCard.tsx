import Link from "next/link";
import SmartThumbnail from "@/components/SmartThumbnail";
import StatusBadge from "@/components/StatusBadge";
import { Chip } from "@/components/Chip";
import { createShortQuestionLabel } from "@/lib/cardIntent";
import { categoryTone, type Cluster, type Post } from "@/lib/posts";

// "가이드 컬렉션 카드"(cluster 레벨) — 상단 small-medium 썸네일(사진 or 흰 패널 폴백) + 상태 배지 + 대표 질문 + 질문 pill + CTA.
// 전부 cluster 데이터에서 생성(특정 질문 하드코딩 X). 이미지는 visualKey 자동 매칭, 정보보다 커지지 않게 상단 썸네일만.
export default function ClusterCard({
  cluster,
  categorySlug,
  counts,
  featuredQuestion,
}: {
  cluster: Cluster;
  categorySlug: string;
  counts: { publishedCount: number; draftCount: number };
  featuredQuestion?: string; // 실제 발행 질문 우선(R1) — 없으면 taxonomy pillar 질문 폴백
}) {
  const href = `/${categorySlug}/${cluster.slug}`;
  const live = counts.publishedCount;
  const soon = counts.draftCount;
  const featuredQ = featuredQuestion || cluster.pillarQuestions?.[0]?.question;
  const pills = (cluster.supportingQuestions ?? [])
    .slice(0, 3)
    .map((q) => createShortQuestionLabel({ question: q.question }));
  const tint = categoryTone(cluster.bigCategory);
  // cluster 비주얼용 synthetic post(imageKey=visualKey, 폴백 alt 용 cluster=title)
  const visual = {
    title: cluster.title,
    cluster: cluster.title,
    bigCategorySlug: categorySlug,
    clusterSlug: cluster.slug,
    imageKey: cluster.visualKey,
  } as Post;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover">
      <SmartThumbnail
        post={visual}
        aspect="16/9"
        level="cluster"
        iconKind={cluster.icon}
        tint={tint}
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold tracking-tight text-ink">
            {/* 카드 전체 클릭(stretched link) */}
            <Link href={href} className="transition-colors after:absolute after:inset-0 group-hover:text-accent-ink">
              {cluster.title}
            </Link>
          </h3>
          <StatusBadge live={live} soon={soon} />
        </div>

        {cluster.description ? (
          <p className="mt-1.5 line-clamp-1 text-sm leading-relaxed text-ink-muted">
            {cluster.description}
          </p>
        ) : null}

        {featuredQ ? (
          <div className="mt-3 rounded-xl bg-section p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-accent-ink">
              Featured guide
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-ink">{featuredQ}</p>
          </div>
        ) : null}

        {pills.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pills.map((p, i) => (
              <Chip key={i}>{p}</Chip>
            ))}
          </div>
        ) : null}

        <span className="mt-3 inline-flex w-fit text-sm font-semibold text-accent-ink">
          {live > 0 ? "Explore" : "Preview topics"} →
        </span>
      </div>
    </div>
  );
}
