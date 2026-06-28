import Link from "next/link";
import Badge from "@/components/Badge";
import ClusterIcon from "@/components/ClusterIcon";
import LineIcon from "@/components/LineIcon";
import { cardIcon, cardIntent, numericHighlights, scopeChips, sourceTone } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

function fmtDate(d?: string): string {
  if (!d) return "";
  const iso = d.length === 7 ? `${d}-01` : d;
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// 카테고리/클러스터 상단 '대표 답변' — compact featured guide. 좌: QA + 칩(가격/시간/Updated/Sources),
// 우: 추상 그래픽 패널(사진 아님 → 같은 페이지 사진 중복 회피). 높이를 줄여 단독 거대 카드처럼 보이지 않게.
export default function FeaturedAnswer({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const isPillar =
    post.questionType === "pillar" || (!!post.pillarSlug && post.pillarSlug === post.slug);
  const isFaq = post.questionType === "faq";
  const numBadges = isPillar ? scopeChips(post, 2) : !isFaq ? numericHighlights(post, intent, 2) : [];
  const updated = post.dateModified || post.datePublished || post.lastUpdatedLabel;
  const src = sourceTone(post);
  const icon = cardIcon(post);

  return (
    <Link
      href={`/answers/${post.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover md:grid-cols-[1fr_220px]"
    >
      {/* LEFT — compact QA */}
      <div className="flex flex-col gap-2 p-5 sm:p-6">
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent-ink">
          <LineIcon name="sparkles" className="h-3.5 w-3.5" strokeWidth={2} />
          Featured guide · {intent}
        </span>
        <h3 className="font-display text-xl font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink sm:text-[1.45rem]">
          {post.question || post.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {numBadges.map((b, i) => (
            <Badge key={i}>{b}</Badge>
          ))}
          {updated ? <Badge variant="updated">Updated {fmtDate(updated)}</Badge> : null}
          {src ? <Badge variant={src.tone === "trust" ? "official" : "default"}>{src.text}</Badge> : null}
        </div>
        {post.summary ? (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-ink-muted">{post.summary}</p>
        ) : null}
        <span className="mt-0.5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-link transition-colors group-hover:text-accent">
          Read answer
          <LineIcon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      {/* RIGHT — 추상 그래픽 패널(사진 아님), 좁고 낮게 */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-accent-soft via-section to-surface md:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(var(--color-accent) 1px, transparent 1px)", backgroundSize: "15px 15px" }}
        />
        <div aria-hidden className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        <ClusterIcon kind={icon} className="absolute bottom-5 right-6 h-16 w-16 text-accent/25" />
      </div>
    </Link>
  );
}
