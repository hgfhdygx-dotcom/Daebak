import Link from "next/link";
import LineIcon from "@/components/LineIcon";
import GoodButton from "@/components/GoodButton";
import ShareButton from "@/components/ShareButton";
import type { PublicAsk } from "@/lib/questions";

// 공개 Ask 카드 — 제목 + verdict/summary + Good(버튼) + 댓글수 + Share + (관련 가이드) + publishedAt.
// 제출자 이메일/이름은 절대 노출하지 않음(공개 필드만).
export default function PublicAskCard({ ask }: { ask: PublicAsk }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link href={`/ask/${ask.slug}`} className="group block">
        <h3 className="font-display text-base font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink">
          {ask.title}
        </h3>
        {ask.verdict || ask.summary ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{ask.verdict || ask.summary}</p>
        ) : null}
      </Link>

      {ask.relatedGuides && ask.relatedGuides.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {ask.relatedGuides.slice(0, 2).map((g, i) => (
            <Link
              key={i}
              href={g.url}
              className="rounded-full bg-section px-2.5 py-1 text-[0.7rem] font-medium text-accent-ink hover:underline"
            >
              {g.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <GoodButton slug={ask.slug} initialCount={ask.goodCount} />
        <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
          <LineIcon name="info" className="h-3.5 w-3.5" />
          {ask.commentCount}
        </span>
        <ShareButton slug={ask.slug} title={ask.title} />
        <Link
          href={`/ask/${ask.slug}`}
          className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-accent-ink"
        >
          View answer
          <LineIcon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>

      {ask.publishedAt ? (
        <p className="mt-2 text-[0.7rem] text-ink-soft">
          {new Date(ask.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      ) : null}
    </div>
  );
}
