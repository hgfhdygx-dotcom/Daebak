import AtAGlance from "@/components/AtAGlance";
import Badge from "@/components/Badge";
import { numericHighlights } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 시간형 답변(fastest) — 소요시간을 먼저 정렬해 보여준다. 데이터 없으면 기존 답변으로 안전 폴백.
export default function TimeFirstTemplate({ post }: { post: Post }) {
  const answer = post.citationPack?.answer || post.summary || "";
  const glance = post.atAGlance || [];
  const badges = numericHighlights(post, "FASTEST", 3); // 시간 토큰 우선 정렬
  if (!answer && glance.length === 0 && badges.length === 0) return null;

  return (
    <>
      <AtAGlance items={glance} />
      <section
        aria-label="Fastest answer"
        className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            Fastest option
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
        </div>
      </section>
    </>
  );
}
