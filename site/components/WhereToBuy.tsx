import LineIcon from "@/components/LineIcon";
import type { Post } from "@/lib/posts";

// 'Where to buy' 수익화 슬롯 — post.monetization 있을 때만. buyLinks(제휴 가능) + officialLinks(공식) + CTA.
// 신뢰 우선: 광고처럼 과하지 않게. 제휴 링크는 rel="nofollow sponsored". 콘텐츠 없으면 렌더 안 함.
export default function WhereToBuy({ post }: { post: Post }) {
  const m = post.monetization;
  if (!m) return null;
  const buy = m.buyLinks || [];
  const official = m.officialLinks || [];
  if (!buy.length && !official.length && !m.ctaUrl) return null;

  return (
    <section aria-label="Where to buy" className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Where to buy</p>
          {m.sponsoredLabel ? (
            <span className="rounded-full bg-section px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-ink-soft">
              {m.sponsoredLabel}
            </span>
          ) : null}
        </div>
        {buy.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {buy.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="nofollow sponsored noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent-ink"
                >
                  <span>
                    {l.label}
                    {l.store ? <span className="text-ink-soft"> · {l.store}</span> : null}
                  </span>
                  <LineIcon name="arrow-up-right" className="h-4 w-4 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {official.length ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {official.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent-ink underline underline-offset-2"
              >
                {l.label}
                <LineIcon name="external" className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        ) : null}
        {m.ctaUrl ? (
          <a
            href={m.ctaUrl}
            target="_blank"
            rel="nofollow sponsored noreferrer"
            className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {m.ctaLabel || "Buy now"}
            <LineIcon name="arrow-up-right" className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
