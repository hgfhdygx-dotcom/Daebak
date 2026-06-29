import Image from "next/image";
import ClusterIcon from "@/components/ClusterIcon";
import { pickImage } from "@/lib/images";
import type { ApprovedVisual } from "@/lib/visuals";
import type { Post } from "@/lib/posts";

// 레벨 기반 문맥 썸네일.
//  - 사진(고관련 실사진)이 있으면 어느 레벨이든 next/image(lazy, hover zoom)로 표시.
//  - 사진이 없을 때:
//      bigCategory / cluster → 흰 배경 패널 폴백(흰색 + ring + 가운데 컬러 아이콘 버블). 거대 빈 박스 금지.
//      article               → 박스를 아예 그리지 않음(null). 작은 카드는 카드 쪽에서 작은 아이콘 배지로 대체.
// 고정 aspect 박스로 CLS 0. 파일 없음/로딩 실패에도 레이아웃 안 깨짐. alt 항상 존재.
const ASPECT: Record<string, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/1": "aspect-[3/1]",
};

export default function SmartThumbnail({
  post,
  visual,
  aspect = "16/9",
  level = "article",
  iconKind,
  alt,
  tint,
  priority = false,
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px",
}: {
  post: Post;
  visual?: ApprovedVisual | null; // 승인된 Unsplash 사진(있으면 hotlink 로 우선 표시). 없으면 폴백.
  aspect?: "16/9" | "4/3" | "1/1" | "3/1";
  level?: "bigCategory" | "cluster" | "article";
  iconKind?: string; // 폴백 아이콘 명시(taxonomy icon). 없으면 문맥 아이콘.
  alt?: string; // 명시 alt. 없으면 레지스트리/폴백 alt.
  tint?: string; // 폴백 아이콘 버블 배경(category tone). 없으면 pale blue.
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const r = pickImage(post);
  const resolvedAlt = alt || r.alt;
  const resolvedIcon = iconKind || r.iconKind;
  const box = `relative overflow-hidden ${ASPECT[aspect] || ASPECT["16/9"]} ${className}`;

  // 승인된 Unsplash 사진 → HOTLINK(<img> 로 Unsplash CDN 직접 표시, 로컬 저장/프록시 없음 = 가이드라인 준수).
  // attribution 은 카드/호출부가 형제 overlay 로 표시(링크 중첩 방지).
  if (visual?.url) {
    return (
      <div className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.url}
          alt={alt || visual.alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          className="photo-toned absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  // 사진 있으면 어느 레벨이든 표시
  if (r.mode === "photo" && r.image) {
    return (
      <div className={box}>
        <Image
          src={"/" + r.image.src.replace(/^\//, "")}
          alt={resolvedAlt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  // 사진 없음 + article → 박스 렌더 안 함(거대 빈 박스 방지; 카드가 작은 아이콘 배지로 대체)
  if (level === "article") return null;

  // 사진 없음 + bigCategory/cluster → 흰 배경 패널 폴백
  return (
    <div
      className={box + " flex items-center justify-center bg-surface ring-1 ring-inset ring-line"}
      role="img"
      aria-label={resolvedAlt}
    >
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink transition-transform duration-300 group-hover:scale-[1.06]"
        style={tint ? { backgroundColor: tint } : undefined}
      >
        <ClusterIcon kind={resolvedIcon} className="h-6 w-6" />
      </span>
    </div>
  );
}
