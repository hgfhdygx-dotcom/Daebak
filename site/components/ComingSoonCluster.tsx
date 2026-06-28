import Link from "next/link";
import ClusterIcon from "@/components/ClusterIcon";
import type { Cluster } from "@/lib/posts";

// coming-soon 클러스터 — 풀 카드 대신 컴팩트 링크/배지(미완성 느낌 제거). 라이브 클러스터만 풀 카드 유지.
export default function ComingSoonCluster({
  cluster,
  categorySlug,
}: {
  cluster: Cluster;
  categorySlug: string;
}) {
  return (
    <Link
      href={`/${categorySlug}/${cluster.slug}`}
      className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-accent/50 hover:text-accent-ink"
    >
      <ClusterIcon
        kind={cluster.icon}
        className="h-4 w-4 text-ink-soft transition-colors group-hover:text-accent-ink"
      />
      {cluster.title}
      <span className="rounded-full bg-section px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-ink-soft">
        Soon
      </span>
    </Link>
  );
}
