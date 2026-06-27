import Link from "next/link";
import MapPin from "@/components/MapPin";
import { PLACES } from "@/lib/presentation";
import { resolveTopicHref } from "@/lib/posts";

// "Explore Korea by neighborhood" — 장소감(여행 블로그 느낌)의 핵심. compact place card + map pin + coral hover.
// 색은 전역 토큰만(흰 카드 + warm beige border + coral hover). 데이터 PLACES, resolver 링크.
export default function ExploreByPlace() {
  return (
    <section>
      <h2 className="font-display text-lg font-bold tracking-tight">Explore Korea by neighborhood</h2>
      <p className="mt-1 text-sm text-ink-muted">Tap a place to see what travelers ask there.</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {PLACES.map((p) => (
          <Link
            key={p.label}
            href={resolveTopicHref({ label: p.label, q: p.q })}
            className="group flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
          >
            <span className="text-ink-soft transition-colors group-hover:text-accent-ink">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="font-medium text-ink transition-colors group-hover:text-accent-ink">
              {p.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
