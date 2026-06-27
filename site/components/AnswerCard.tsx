import Link from "next/link";
import Badge from "@/components/Badge";
import type { Post } from "@/lib/posts";

function fmtDate(d?: string): string {
  if (!d) return "";
  const iso = d.length === 7 ? `${d}-01` : d;
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// 답변형 콘텐츠 카드 — 카드만 봐도 "실용적 숫자 + 출처"가 느껴지게 (가격/시간/업데이트/출처 뱃지).
export default function AnswerCard({ post }: { post: Post }) {
  const badges = (post.highlights || []).filter((h) => String(h).trim()).slice(0, 2);
  const updated = post.dateModified || post.datePublished || post.lastUpdatedLabel;
  const hasSources = (post.sources?.length ?? 0) > 0;

  return (
    <Link
      href={`/answers/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-line p-5 transition-colors hover:bg-surface"
    >
      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink">
        {post.question || post.title}
      </h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {badges.map((b, i) => (
          <Badge key={i} tone="muted">
            {b}
          </Badge>
        ))}
        {updated ? <Badge tone="muted">Updated {fmtDate(updated)}</Badge> : null}
        {hasSources ? <Badge tone="trust">Sources</Badge> : null}
      </div>

      {post.summary ? (
        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-muted">
          {post.summary}
        </p>
      ) : null}

      <span className="mt-4 inline-flex items-center text-sm font-semibold text-accent-ink">
        Read answer →
      </span>
    </Link>
  );
}
