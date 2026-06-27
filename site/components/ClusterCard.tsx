import Link from "next/link";
import ClusterIcon from "@/components/ClusterIcon";
import StatusBadge from "@/components/StatusBadge";
import { Chip } from "@/components/Chip";
import { createShortQuestionLabel } from "@/lib/cardIntent";
import { CATEGORY_TINT } from "@/lib/presentation";
import type { Cluster } from "@/lib/posts";

// "가이드 컬렉션 카드" — 아이콘 버블 + 상태 배지 + 대표 질문(내부 박스) + 자동 질문 pill + CTA.
// 전부 cluster 데이터에서 생성(특정 질문 하드코딩 X). 질문 pill 은 미발행일 수 있어 시각용(링크 X).
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
  const tint = CATEGORY_TINT[cluster.bigCategory] || "#faf6f0";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-accent-ink"
          style={{ backgroundColor: tint }}
        >
          <ClusterIcon kind={cluster.icon} className="h-5 w-5" />
        </span>
        <StatusBadge live={live} soon={soon} />
      </div>

      <h3 className="mt-3 font-display text-base font-bold tracking-tight text-ink">
        {/* 카드 전체 클릭(stretched link) */}
        <Link href={href} className="transition-colors after:absolute after:inset-0 group-hover:text-accent-ink">
          {cluster.title}
        </Link>
      </h3>

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
  );
}
