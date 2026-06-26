import Eyebrow from "@/components/Eyebrow";
import MetaLine from "@/components/MetaLine";
import CitationPack from "@/components/CitationPack";
import FaqSection from "@/components/FaqSection";
import RelatedAnswers from "@/components/RelatedAnswers";
import Markdown from "@/components/Markdown";
import { readingTime } from "@/lib/readingTime";
import type { Post } from "@/lib/posts";

// 답변 페이지 템플릿(Daebak 이식) — GEO 요소: answer-first → Citation Pack → 본문 → FAQ → 출처 → 관련.
export default function Article({
  post,
  related = [],
}: {
  post: Post;
  related?: Post[];
}) {
  const minutes = readingTime(`${post.citationPack?.answer ?? ""} ${post.body}`);
  const lead = post.citationPack?.answer || post.summary || "";
  const updated = post.lastUpdatedLabel || post.dateModified || post.datePublished;

  return (
    <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
      <div className="grid grid-cols-1 gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16 lg:py-16">
        <article className="min-w-0">
          <Eyebrow>Q&amp;A</Eyebrow>

          {/* H1 = 질문 원문 그대로 */}
          <h1 className="mt-3 font-display text-[clamp(2.1rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
            {post.question || post.title}
          </h1>

          <MetaLine author={post.author} updated={updated} minutes={minutes} />

          {/* answer-first 즉답 */}
          {lead ? (
            <p className="mt-8 border-l-2 border-accent pl-5 text-xl leading-relaxed">
              {lead}
            </p>
          ) : null}

          {/* Citation Pack(핵심 사실 + 인용 문장) */}
          {post.citationPack ? <CitationPack pack={post.citationPack} /> : null}

          {/* 본문 */}
          {post.body ? <Markdown>{post.body}</Markdown> : null}

          {/* FAQ */}
          {post.faq && post.faq.length > 0 ? (
            <FaqSection items={post.faq} />
          ) : null}

          {/* 출처 */}
          {post.sources && post.sources.length > 0 ? (
            <section className="mt-12 border-t border-line pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Sources
              </h2>
              <ul className="mt-3 space-y-1 text-sm text-ink-muted">
                {post.sources.map((s, i) => (
                  <li key={i}>
                    <a
                      className="text-accent-ink underline underline-offset-2"
                      href={s.url}
                      target="_blank"
                      rel="nofollow noreferrer"
                    >
                      {s.domain || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* 모바일: 관련 답변 하단 */}
          <div className="mt-12 lg:hidden">
            <RelatedAnswers posts={related} />
          </div>
        </article>

        {/* 데스크톱: 관련 답변 사이드바 */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <RelatedAnswers posts={related} />
          </div>
        </aside>
      </div>
    </div>
  );
}
