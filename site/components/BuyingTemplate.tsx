import AtAGlance from "@/components/AtAGlance";
import { Chip } from "@/components/Chip";
import { cardIntent } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 구매형 답변(where to buy / what to buy) — 상품군(productGroups)·구매처(buyLocations) 칩.
// 없으면 기존 답변으로 안전 폴백. 특정 상품/매장 하드코딩 X.
export default function BuyingTemplate({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const answer = post.citationPack?.answer || post.summary || "";
  const glance = post.atAGlance || [];
  const locations = post.buyLocations || [];
  const groups = post.productGroups || [];
  if (!answer && glance.length === 0 && locations.length === 0 && groups.length === 0) return null;

  return (
    <>
      <AtAGlance items={glance} />
      <section
        aria-label="Buying guide"
        className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            {intent === "WHERE TO BUY" ? "Where to buy" : "What to buy"}
          </p>
          {answer ? (
            <p className="mt-2 text-lg font-medium leading-relaxed text-ink">{answer}</p>
          ) : null}
          {groups.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink">What to buy</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {groups.map((g, i) => (
                  <Chip key={i}>{g}</Chip>
                ))}
              </div>
            </div>
          ) : null}
          {locations.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink">Where to find it</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {locations.map((l, i) => (
                  <Chip key={i}>{l}</Chip>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
