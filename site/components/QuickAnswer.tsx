import type { Post } from "@/lib/posts";
import AtAGlance from "@/components/AtAGlance";
import Badge from "@/components/Badge";

// 페이지의 "결론" 박스 = 3초 선택지 칩 + 추천 한 줄 + 핵심 뱃지(시간/가격/이유). 범용.
export default function QuickAnswer({ post }: { post: Post }) {
  const answer = post.citationPack?.answer || post.summary || "";
  const glance = post.atAGlance || [];
  const highlights = (post.highlights || []).filter((h) => String(h).trim()).slice(0, 4);

  if (!answer && glance.length === 0 && highlights.length === 0) return null;

  return (
    <>
      <AtAGlance items={glance} />

      {answer || highlights.length > 0 ? (
        <section
          aria-label="Quick answer"
          className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface"
        >
          <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
              Quick answer
            </p>
            {answer ? (
              <p className="mt-2 text-lg font-medium leading-relaxed text-ink">
                {answer}
              </p>
            ) : null}
            {highlights.length > 0 ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {highlights.map((h, i) => (
                  <Badge key={i}>{h}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
