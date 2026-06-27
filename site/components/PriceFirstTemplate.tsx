import AtAGlance from "@/components/AtAGlance";
import Badge from "@/components/Badge";
import { cardIntent, numericHighlights } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 가격형 답변(cheapest / price / cost) — 가격을 먼저 정렬해 보여주고, 있으면 "가격 변동 요인"까지.
// 구조 필드(priceFactors) 없으면 기존 데이터로 안전 폴백(의도별 정렬·헤딩은 유지). 특정 질문 하드코딩 X.
export default function PriceFirstTemplate({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const answer = post.citationPack?.answer || post.summary || "";
  const glance = post.atAGlance || [];
  const badges = numericHighlights(post, "CHEAPEST", 3); // 가격 토큰 우선 정렬
  const factors = post.priceFactors || [];
  if (!answer && glance.length === 0 && badges.length === 0 && factors.length === 0) return null;

  return (
    <>
      <AtAGlance items={glance} />
      <section
        aria-label="Price answer"
        className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            {intent === "CHEAPEST" ? "Cheapest option" : "What it costs"}
          </p>
          {answer ? (
            <p className="mt-2 text-lg font-medium leading-relaxed text-ink">{answer}</p>
          ) : null}
          {badges.length > 0 ? (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <Badge key={i}>{b}</Badge>
              ))}
            </div>
          ) : null}
          {factors.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink">What changes the price</p>
              <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                {factors.map((f, i) => (
                  <li key={i}>· {f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
