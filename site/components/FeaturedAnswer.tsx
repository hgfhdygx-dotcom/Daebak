import Link from "next/link";
import Badge from "@/components/Badge";
import ClusterIcon from "@/components/ClusterIcon";
import LineIcon from "@/components/LineIcon";
import TrustMeta from "@/components/TrustMeta";
import { cardIcon, cardIntent, numericHighlights, scopeChips } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 카테고리/클러스터 상단 '대표 답변' — compact featured guide. 좌: QA + primary 칩(가격/시간) + 신뢰 메타(Updated·Sources),
// 우: 추상 그래픽 패널(사진 아님 → 같은 페이지 사진 중복 회피). 카드/상세와 동일한 metadata 규칙(TrustMeta).
export default function FeaturedAnswer({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const isPillar =
    post.questionType === "pillar" || (!!post.pillarSlug && post.pillarSlug === post.slug);
  const isFaq = post.questionType === "faq";
  const numBadges = isPillar ? scopeChips(post, 2) : !isFaq ? numericHighlights(post, intent, 2) : [];
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
        {numBadges.length ? (
          <div className="flex flex-wrap gap-1.5">
            {numBadges.map((b, i) => (
              <Badge key={i}>{b}</Badge>
            ))}
          </div>
        ) : null}
        <TrustMeta post={post} />
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
