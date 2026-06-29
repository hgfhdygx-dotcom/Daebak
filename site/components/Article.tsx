import Eyebrow from "@/components/Eyebrow";
import Breadcrumb from "@/components/Breadcrumb";
import LineIcon from "@/components/LineIcon";
import MetaLine from "@/components/MetaLine";
import IntentAnswer from "@/components/IntentAnswer";
import RouteStrip from "@/components/RouteStrip";
import ComparisonBlock from "@/components/ComparisonBlock";
import FaqSection from "@/components/FaqSection";
import WhereToBuy from "@/components/WhereToBuy";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";
import NextQuestions from "@/components/NextQuestions";
import RelatedAnswers from "@/components/RelatedAnswers";
import Sidebar, { AskCta } from "@/components/Sidebar";
import AskInlineCta from "@/components/AskInlineCta";
import Markdown from "@/components/Markdown";
import { extractFirstTable } from "@/lib/markdownTable";
import { readingTime } from "@/lib/readingTime";
import type { Post } from "@/lib/posts";

// 답변 페이지 — "비교하고 바로 고르는 가이드".
// 순서: 브레드크럼 → H1 → 결론 박스 → (신선도 고지) → 경로 → 비교블록 → 상세 → 다음질문 → FAQ → 출처. 우측 sticky 사이드바(lg+).
export default function Article({
  post,
  related = [],
  crumbs = [],
}: {
  post: Post;
  related?: Post[];
  crumbs?: { name: string; href?: string }[];
}) {
  const minutes = readingTime(`${post.citationPack?.answer ?? ""} ${post.body}`);
  const updated = post.lastUpdatedLabel || post.dateModified || post.datePublished;
  const { table, body } = extractFirstTable(post.body || "");

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-9 sm:px-6 sm:py-12 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <article className="min-w-0">
          {crumbs.length > 0 ? <Breadcrumb items={crumbs} /> : null}

          <Eyebrow>Q&amp;A</Eyebrow>

          <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.9rem)] font-bold leading-[1.12] tracking-tight">
            {post.question || post.title}
          </h1>

          <MetaLine updated={updated} minutes={minutes} />

          <IntentAnswer post={post} />

          {/* 신선도 고지 — 가격·일정·규정이 바뀔 수 있는 글(§20) */}
          {post.needsFreshSource ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-section px-4 py-3 text-sm text-ink-muted">
              <LineIcon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
              <span>
                Prices and schedules can change.
                {updated ? ` Last updated ${updated}.` : ""} Confirm details on the official source
                before you travel.
              </span>
            </p>
          ) : null}

          {post.route && post.route.length > 0 ? (
            <RouteStrip stops={post.route} />
          ) : null}

          {table ? <ComparisonBlock table={table} /> : null}

          {body ? <Markdown>{body}</Markdown> : null}

          {/* 본문 중간: 다음 질문 카드(§18) */}
          <NextQuestions posts={related.slice(0, 4)} />

          {post.faq && post.faq.length > 0 ? (
            <FaqSection items={post.faq} />
          ) : null}

          {/* 수익화 슬롯(피벗) — monetization 있을 때만. 'Where to buy' + 조용한 제휴 고지 */}
          <WhereToBuy post={post} />
          <AffiliateDisclosure post={post} />

          {/* 출처 — 도메인 + 한 줄 설명(공식/제3자 구분) */}
          {post.sources && post.sources.length > 0 ? (
            <section className="mt-12 border-t border-line pt-6" aria-label="Sources">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Sources
              </h2>
              <ul className="mt-3 space-y-2">
                {post.sources.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                    <LineIcon name="external" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" />
                    <span>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="nofollow noreferrer"
                        className="font-medium text-accent-ink underline underline-offset-2 transition-opacity hover:opacity-80"
                      >
                        {s.domain || s.url}
                      </a>
                      {s.note ? <span className="text-ink-muted"> — {s.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* 답이 부족하면 질문 수집(검색+질문 파이프라인) */}
          <AskInlineCta q={post.question || post.title} className="mt-12" />

          {/* 모바일: 문의 CTA + 관련 답변 (사이드바 대체) */}
          <div className="mt-12 lg:hidden">
            <AskCta />
          </div>
          <div className="lg:hidden">
            <RelatedAnswers posts={related} />
          </div>
        </article>

        {/* 데스크톱: sticky 사이드바 */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Sidebar post={post} table={table} related={related} />
          </div>
        </aside>
      </div>
    </div>
  );
}
