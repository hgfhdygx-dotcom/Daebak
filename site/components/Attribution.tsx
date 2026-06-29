import type { ApprovedVisual } from "@/lib/visuals";

// Unsplash attribution — 사진 근처에 작고 조용하게: "Photo by {photographer} on Unsplash".
// photographer → 프로필, Unsplash → 사진 페이지(둘 다 UTM 포함). Unsplash 로고는 사용하지 않음(텍스트만).
// 카드의 링크 안에 중첩되지 않도록 항상 형제(overlay)로 배치하고, pointer-events-auto + z-10 로 클릭 보장.
export default function Attribution({
  visual,
  className = "",
  tone = "overlay",
}: {
  visual: Pick<ApprovedVisual, "photographerName" | "photographerUrl" | "sourceUrl">;
  className?: string;
  tone?: "overlay" | "plain";
}) {
  const base =
    tone === "overlay"
      ? "pointer-events-auto inline-flex max-w-[92%] items-center gap-1 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[0.62rem] font-medium leading-none text-white/90 backdrop-blur-sm"
      : "inline-flex items-center gap-1 text-[0.7rem] text-ink-soft";
  const link =
    tone === "overlay"
      ? "underline decoration-white/40 underline-offset-2 hover:decoration-white"
      : "underline decoration-line underline-offset-2 hover:text-accent-ink";
  return (
    <span className={`${base} ${className}`}>
      Photo by{" "}
      <a href={visual.photographerUrl} target="_blank" rel="noreferrer nofollow" className={link}>
        {visual.photographerName}
      </a>{" "}
      on{" "}
      <a href={visual.sourceUrl} target="_blank" rel="noreferrer nofollow" className={link}>
        Unsplash
      </a>
    </span>
  );
}
