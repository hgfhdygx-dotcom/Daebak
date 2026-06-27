import Link from "next/link";
import type { Cluster } from "@/lib/posts";

// 카테고리 허브의 클러스터 카드 — 제목·설명·발행/예정 수·대표 pillar·supporting 2~3 (§17).
export default function ClusterCard({
  cluster,
  categorySlug,
  counts,
}: {
  cluster: Cluster;
  categorySlug: string;
  counts: { publishedCount: number; draftCount: number };
}) {
  const pillar = cluster.pillarQuestions?.[0];
  const supporting = (cluster.supportingQuestions ?? []).slice(0, 3);
  return (
    <Link
      href={`/${categorySlug}/${cluster.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-bold tracking-tight text-ink transition-colors group-hover:text-accent-ink">
          {cluster.title}
        </h3>
        <span className="shrink-0 whitespace-nowrap text-xs text-ink-muted">
          {counts.publishedCount} live
          {counts.draftCount ? ` · ${counts.draftCount} soon` : ""}
        </span>
      </div>
      {cluster.description ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {cluster.description}
        </p>
      ) : null}
      {pillar ? (
        <p className="mt-2.5 text-sm font-medium text-ink">{pillar.question}</p>
      ) : null}
      {supporting.length ? (
        <ul className="mt-1.5 space-y-0.5 text-xs text-ink-muted">
          {supporting.map((s, i) => (
            <li key={i} className="truncate">
              · {s.question}
            </li>
          ))}
        </ul>
      ) : null}
      <span className="mt-3 inline-flex w-fit text-sm font-semibold text-accent-ink">
        Explore →
      </span>
    </Link>
  );
}
