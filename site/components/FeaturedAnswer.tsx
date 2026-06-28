import Link from "next/link";
import Badge from "@/components/Badge";
import ClusterIcon from "@/components/ClusterIcon";
import Eyebrow from "@/components/Eyebrow";
import LineIcon from "@/components/LineIcon";
import { cardIcon, cardIntent, numericHighlights, scopeChips } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 카테고리/클러스터 상단 '대표 답변' — 2단(좌: QA 텍스트, 우: 추상 그래픽 패널).
// 우측은 사진이 아니라 CSS 그래픽 → 같은 페이지 사진 중복 회피 + 전폭 빈 공간 제거(premium SaaS 톤).
export default function FeaturedAnswer({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const isPillar =
    post.questionType === "pillar" || (!!post.pillarSlug && post.pillarSlug === post.slug);
  const chips = isPillar ? scopeChips(post, 2) : numericHighlights(post, intent, 2);
  const icon = cardIcon(post);

  return (
    <Link
      href={`/answers/${post.slug}`}
      className="group grid overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover md:grid-cols-[1.15fr_0.85fr]"
    >
      {/* LEFT — QA */}
      <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
        <Eyebrow>{intent}</Eyebrow>
        <h3 className="font-display text-2xl font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink sm:text-[1.7rem]">
          {post.question || post.title}
        </h3>
        {chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((b, i) => (
              <Badge key={i}>{b}</Badge>
            ))}
          </div>
        ) : null}
        {post.summary ? (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
            {post.summary}
          </p>
        ) : null}
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
          Read answer
          <LineIcon name="arrow-right" className="h-4 w-4" />
        </span>
      </div>

      {/* RIGHT — 추상 그래픽 패널(사진 아님) */}
      <div className="relative hidden min-h-[210px] overflow-hidden bg-gradient-to-br from-accent-soft via-section to-surface md:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(var(--color-accent) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
        />
        <div aria-hidden className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />
        <ClusterIcon kind={icon} className="absolute bottom-6 right-7 h-24 w-24 text-accent/25" />
      </div>
    </Link>
  );
}
