import AtAGlance from "@/components/AtAGlance";
import Badge from "@/components/Badge";
import type { Post } from "@/lib/posts";

// 추천형 답변(best / top picks) — topPick 강조 + 추천 기준(criteria). 없으면 핵심 배지로 폴백.
export default function RecommendationTemplate({ post }: { post: Post }) {
  const answer = post.citationPack?.answer || post.summary || "";
  const glance = post.atAGlance || [];
  const highlights = (post.highlights || []).filter((h) => String(h).trim()).slice(0, 4);
  const topPick = post.topPick || "";
  const criteria = post.criteria || [];
  if (!answer && glance.length === 0 && highlights.length === 0 && !topPick && criteria.length === 0)
    return null;

  return (
    <>
      <AtAGlance items={glance} />
      <section
        aria-label="Recommendation"
        className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Our pick</p>
          {topPick ? (
            <p className="mt-1 text-lg font-semibold leading-snug text-ink">🏆 {topPick}</p>
          ) : null}
          {answer ? (
            <p className="mt-2 text-base leading-relaxed text-ink-muted">{answer}</p>
          ) : null}
          {highlights.length > 0 ? (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {highlights.map((h, i) => (
                <Badge key={i}>{h}</Badge>
              ))}
            </div>
          ) : null}
          {criteria.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink">How to choose</p>
              <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                {criteria.map((c, i) => (
                  <li key={i}>· {c}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
