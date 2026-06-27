import Link from "next/link";
import Badge from "@/components/Badge";
import Eyebrow from "@/components/Eyebrow";
import MapPin from "@/components/MapPin";
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

// 범용 답변 카드 — 상단에 데이터 기반 인텐트 라벨(cardIntent), 역할(pillar/supporting/faq)에 따라 메타가
// 달라짐. 개요(pillar)·FAQ 는 특정 숫자 배지 안 붙임(규칙4/6). 데이터 없는 칩은 숨김(규칙8).
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
  // supporting=숫자 배지 / pillar=범위 칩(단일 숫자 금지) / faq=배지 없음
  const numBadges = isPillar
    ? scopeChips(post, 2)
    : !isFaq
      ? numericHighlights(post, intent, 2)
      : [];

  return (
    <Link
      href={`/answers/${post.slug}`}
      className={
        "group flex flex-col rounded-[20px] border border-line p-4 transition-all duration-150 hover:border-accent/30 hover:shadow-sm sm:p-5" +
        (featured ? " bg-surface sm:p-6" : " hover:bg-surface")
      }
    >
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
            ? "mt-3 inline-flex w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
            : "mt-4 inline-flex items-center text-sm font-semibold text-link transition-colors group-hover:text-accent"
        }
      >
        Read answer →
      </span>
    </Link>
  );
}
