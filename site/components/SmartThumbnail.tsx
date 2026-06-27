import Image from "next/image";
import ClusterIcon from "@/components/ClusterIcon";
import { pickImage } from "@/lib/images";
import type { Post } from "@/lib/posts";

// 문맥 기반 썸네일 — 사진 있으면 next/image(lazy, hover zoom), 없으면 폴백 일러스트(그라데이션+아이콘).
// 고정 aspect 박스로 CLS 0. 파일 없음/로딩 실패에도 레이아웃 안 깨짐. alt 항상 존재.
const ASPECT: Record<string, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/1": "aspect-[3/1]",
};

export default function SmartThumbnail({
  post,
  aspect = "16/9",
  priority = false,
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px",
}: {
  post: Post;
  aspect?: "16/9" | "4/3" | "1/1" | "3/1";
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const r = pickImage(post);
  const box = `relative overflow-hidden ${ASPECT[aspect] || ASPECT["16/9"]} ${className}`;

  if (r.mode === "photo" && r.image) {
    return (
      <div className={box}>
        <Image
          src={"/" + r.image.src.replace(/^\//, "")}
          alt={r.alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  // 폴백: pale-blue 그라데이션 + 문맥 아이콘 (사진 있는 '척' 안 함, 깨짐 0)
  return (
    <div
      className={box + " flex items-center justify-center bg-gradient-to-br from-accent-soft to-surface"}
      role="img"
      aria-label={r.alt}
    >
      <ClusterIcon
        kind={r.iconKind}
        className="h-9 w-9 text-accent-ink/70 transition-transform duration-300 group-hover:scale-[1.06]"
      />
    </div>
  );
}
