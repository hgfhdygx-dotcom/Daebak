import { Chip, ChipList } from "@/components/Chip";
import { PLACES } from "@/lib/presentation";
import { resolveTopicHref } from "@/lib/posts";

// "Explore by place" — 동네 칩(데이터 PLACES, resolver 링크). 모바일 가로스크롤.
export default function ExploreByPlace() {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold tracking-tight">Explore by place</h2>
      <p className="mt-1 text-sm text-ink-muted">Browse Korea by neighborhood.</p>
      <ChipList scroll className="mt-3">
        {PLACES.map((p) => (
          <Chip
            key={p.label}
            href={resolveTopicHref({ label: p.label, q: p.q })}
            className="shrink-0 px-3.5 py-1.5 text-sm"
          >
            {p.label}
          </Chip>
        ))}
      </ChipList>
    </section>
  );
}
