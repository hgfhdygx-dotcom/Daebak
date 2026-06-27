import Link from "next/link";
import ClusterIcon from "@/components/ClusterIcon";
import { NEEDS } from "@/lib/presentation";
import { resolveTopicHref } from "@/lib/posts";

// "Explore by need" — 목적별 진입(데이터 NEEDS, resolver 링크: 존재 cluster면 cluster page).
export default function ExploreByNeed() {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold tracking-tight">Plan by what you need</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {NEEDS.map((n) => (
          <Link
            key={n.label}
            href={resolveTopicHref(n)}
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm transition-shadow hover:shadow-sm"
          >
            <span className="text-accent-ink">
              <ClusterIcon kind={n.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="text-ink transition-colors group-hover:text-accent-ink">{n.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
