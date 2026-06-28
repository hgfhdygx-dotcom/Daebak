import Link from "next/link";
import Badge from "@/components/Badge";
import ClusterIcon from "@/components/ClusterIcon";
import Eyebrow from "@/components/Eyebrow";
import LineIcon from "@/components/LineIcon";
import MapPin from "@/components/MapPin";
import SmartThumbnail from "@/components/SmartThumbnail";
import { cardIcon, cardIntent, numericHighlights, scopeChips } from "@/lib/cardIntent";
import { hasPhoto } from "@/lib/images";
import type { Post } from "@/lib/posts";

type Variant = "featured" | "grid" | "list";

// 여행 가이드 카드(article 레벨) — answer-first 메타 우선. 칩은 핵심 2개(가격/시간·범위)만 — Updated/Sources 칩은
// 카드에서 제거(데이터는 상세/JSON-LD 에 유지). 작은 Q&A 카드는 기본 이미지 없이 작은 아이콘 배지(같은 페이지
// 중복 회피용으로 부모가 distinctCardIcons 로 icon 을 내려줌). 색은 전역 토큰만.
export default function AnswerCard({
  post,
  variant = "grid",
  icon,
}: {
  post: Post;
  variant?: Variant;
  icon?: string; // 부모(리스트)가 내려주는 중복 회피 아이콘. 없으면 문맥 아이콘.
}) {
  const intent = cardIntent(post);
  const isPillar =
    post.questionType === "pillar" || (!!post.pillarSlug && post.pillarSlug === post.slug);
  const isFaq = post.questionType === "faq";
  const featured = variant === "featured";
  const photo = !!post.imageKey && hasPhoto(post); // 작은 카드는 imageKey 명시 때만 썸네일
  const badgeIcon = icon || cardIcon(post);
  // supporting=숫자 칩 / pillar=범위 칩(단일 숫자 금지) / faq=칩 없음. 최대 2개.
  const numBadges = isPillar
    ? scopeChips(post, 2)
    : !isFaq
      ? numericHighlights(post, intent, 2)
      : [];

  return (
    <Link
      href={`/answers/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
    >
      {photo ? (
        <SmartThumbnail
          post={post}
          aspect="16/9"
          level="article"
          priority={featured}
          className={featured ? "max-h-56" : ""}
        />
      ) : null}

      <div className={"flex flex-1 flex-col " + (featured ? "p-5 sm:p-6" : "p-4 sm:p-5")}>
        <div className="flex items-start gap-2.5">
          {!photo ? (
            <span
              className={
                "inline-flex shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink " +
                (featured ? "h-11 w-11" : "h-10 w-10")
              }
            >
              <ClusterIcon kind={badgeIcon} className={featured ? "h-5 w-5" : "h-[18px] w-[18px]"} />
            </span>
          ) : null}
          <div className="min-w-0">
            {post.place ? (
              <span className="mb-0.5 inline-flex items-center gap-1 text-[0.7rem] font-medium text-ink-soft">
                <MapPin className="h-3 w-3" />
                {post.place}
              </span>
            ) : null}
            <Eyebrow>{intent}</Eyebrow>
          </div>
        </div>

        <h3
          className={
            "mt-2 font-display font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink " +
            (featured ? "text-xl sm:text-2xl" : "text-lg font-semibold")
          }
        >
          {post.question || post.title}
        </h3>

        {!isFaq && numBadges.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {numBadges.map((b, i) => (
              <Badge key={i}>{b}</Badge>
            ))}
          </div>
        ) : null}

        {post.summary ? (
          <p
            className={
              "mt-2.5 flex-1 text-sm leading-relaxed text-ink-muted " +
              (isFaq ? "line-clamp-2" : "line-clamp-2")
            }
          >
            {post.summary}
          </p>
        ) : null}

        <span
          className={
            featured
              ? "mt-4 inline-flex w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              : "mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link transition-all group-hover:text-accent"
          }
        >
          Read answer
          <LineIcon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
