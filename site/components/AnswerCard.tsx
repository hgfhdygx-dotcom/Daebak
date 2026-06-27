import Link from "next/link";
import Badge from "@/components/Badge";
import Eyebrow from "@/components/Eyebrow";
import MapPin from "@/components/MapPin";
import SmartThumbnail from "@/components/SmartThumbnail";
import { cardIntent, numericHighlights, scopeChips, sourceTone } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

function fmtDate(d?: string): string {
  if (!d) return "";
  const iso = d.length === 7 ? `${d}-01` : d;
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type Variant = "featured" | "grid" | "list";

// 여행 가이드 카드 — 상단 문맥 썸네일(사진 or 폴백 일러스트) + answer-first 메타(인텐트 라벨·가격/시간 칩·Updated·Sources).
// 색은 전역 토큰만(흰 카드 + 블루 그림자 + pale blue 칩). 새 글이 들어와도 동일 적용·이미지 없어도 안 깨짐.
export default function AnswerCard({
  post,
  variant = "grid",
}: {
  post: Post;
  variant?: Variant;
}) {
  const intent = cardIntent(post);
  const isPillar =
    post.questionType === "pillar" || (!!post.pillarSlug && post.pillarSlug === post.slug);
  const isFaq = post.questionType === "faq";
  const featured = variant === "featured";
  const updated = post.dateModified || post.datePublished || post.lastUpdatedLabel;
  const src = sourceTone(post);
  // supporting=숫자 칩 / pillar=범위 칩(단일 숫자 금지) / faq=칩 없음
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
      <SmartThumbnail post={post} aspect={featured ? "16/9" : "16/9"} priority={featured} />

      <div className={"flex flex-1 flex-col " + (featured ? "p-5 sm:p-6" : "p-4 sm:p-5")}>
        {post.place ? (
          <span className="mb-1 inline-flex items-center gap-1 text-[0.7rem] font-medium text-ink-soft">
            <MapPin className="h-3 w-3" />
            {post.place}
          </span>
        ) : null}
        <Eyebrow>{intent}</Eyebrow>

        <h3
          className={
            "mt-1.5 font-display font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink " +
            (featured ? "text-xl sm:text-2xl" : "text-lg font-semibold")
          }
        >
          {post.question || post.title}
        </h3>

        {isFaq ? (
          updated ? (
            <div className="mt-2 text-xs text-ink-muted">Updated {fmtDate(updated)}</div>
          ) : null
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {numBadges.map((b, i) => (
              <Badge key={i}>{b}</Badge>
            ))}
            {updated ? <Badge variant="updated">Updated {fmtDate(updated)}</Badge> : null}
            {src ? <Badge variant={src.tone === "trust" ? "official" : "default"}>{src.text}</Badge> : null}
          </div>
        )}

        {post.summary ? (
          <p
            className={
              "mt-2.5 flex-1 text-sm leading-relaxed text-ink-muted " +
              (isFaq ? "line-clamp-1" : "line-clamp-2")
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
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
