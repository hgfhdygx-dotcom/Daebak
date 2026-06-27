import AtAGlance from "@/components/AtAGlance";
import { Chip } from "@/components/Chip";
import type { Post } from "@/lib/posts";

// worth_it 질문 전용 판단형 답변(데이터 있을 때만 각 줄 렌더 — 없으면 숨김). 특정 질문 하드코딩 X.
export default function WorthItAnswerTemplate({ post }: { post: Post }) {
  const verdict = post.verdict || post.citationPack?.answer || post.summary;
  return (
    <div className="mt-6">
      {post.atAGlance && post.atAGlance.length > 0 ? <AtAGlance items={post.atAGlance} /> : null}

      <div className="mt-4 rounded-2xl border border-line bg-section p-5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-ink">
          The verdict
        </p>
        {verdict ? (
          <p className="mt-1 text-lg font-medium leading-snug text-ink">{verdict}</p>
        ) : null}

        {(post.goodFor?.length || post.notFor?.length) ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {post.goodFor?.length ? (
              <div>
                <p className="text-xs font-semibold text-ink">👍 Good for</p>
                <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                  {post.goodFor.map((g, i) => (
                    <li key={i}>· {g}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {post.notFor?.length ? (
              <div>
                <p className="text-xs font-semibold text-ink">👎 Not for</p>
                <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                  {post.notFor.map((g, i) => (
                    <li key={i}>· {g}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {post.alternatives?.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink">Alternatives</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {post.alternatives.map((a, i) => (
                <Chip key={i}>{a}</Chip>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
