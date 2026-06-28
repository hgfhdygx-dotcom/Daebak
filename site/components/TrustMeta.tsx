import LineIcon from "@/components/LineIcon";
import { sourceTone } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

function fmtDate(d?: string): string {
  if (!d) return "";
  const iso = d.length === 7 ? `${d}-01` : d;
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// 신뢰 메타데이터(Updated · Sources) — 가격/시간(primary chip)보다 작고 조용한 한 줄.
// 카드(Featured/small)와 상세 페이지가 같은 규칙을 공유. 모바일에서 자연 줄바꿈(flex-wrap).
export default function TrustMeta({ post, className = "" }: { post: Post; className?: string }) {
  const updated = post.dateModified || post.datePublished || post.lastUpdatedLabel;
  const src = sourceTone(post);
  if (!updated && !src) return null;
  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] font-medium text-ink-soft " + className
      }
    >
      {updated ? (
        <span className="inline-flex items-center gap-1">
          <LineIcon name="clock" className="h-3 w-3" strokeWidth={2} />
          Updated {fmtDate(updated)}
        </span>
      ) : null}
      {src ? (
        <span className="inline-flex items-center gap-1">
          <LineIcon name="shield-check" className="h-3 w-3" strokeWidth={2} />
          {src.text}
        </span>
      ) : null}
    </div>
  );
}
