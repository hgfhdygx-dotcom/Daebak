import { Chip } from "@/components/Chip";
import type { Post } from "@/lib/posts";

// Entity 답변(브랜드/스토어/앱/제품) 상단 블록 — Direct answer + Price + Quick facts + Best for + 외국인 노트.
// pageType="entity" 일 때 IntentAnswer 가 분기. 구조 필드 없으면 안전 폴백(있는 것만 표시). 하드코딩 X.
export default function EntityTemplate({ post }: { post: Post }) {
  const answer = post.citationPack?.answer || post.summary || "";
  const facts = post.quickFacts || post.atAGlance || [];
  const bestFor = post.goodFor || [];
  const notes = post.foreignerNotes || [];
  const mistakes = post.commonMistakes || [];
  if (!answer && facts.length === 0 && bestFor.length === 0) return null;

  return (
    <section aria-label="Overview" className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Overview</p>
        {answer ? <p className="mt-2 text-lg font-medium leading-relaxed text-ink">{answer}</p> : null}
        {post.priceRange ? (
          <p className="mt-3 text-sm text-ink-muted">
            <span className="font-semibold text-ink">Price range:</span> {post.priceRange}
          </p>
        ) : null}
        {facts.length ? (
          <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {facts.map((f, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-line/60 pb-1.5 text-sm">
                <dt className="text-ink-muted">{f.label}</dt>
                <dd className="text-right font-medium text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {bestFor.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink">Best for</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {bestFor.map((b, i) => (
                <Chip key={i}>{b}</Chip>
              ))}
            </div>
          </div>
        ) : null}
        {notes.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink">Foreigner-friendly notes</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
              {notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent-ink">·</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {mistakes.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink">Common mistakes</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
              {mistakes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent-ink">·</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
