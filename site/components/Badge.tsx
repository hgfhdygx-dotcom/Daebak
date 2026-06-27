import type { ReactNode } from "react";

// 공용 정보 뱃지 — 색은 대부분 '중립'. 출처/공식(source/official)만 아주 옅은 블루.
// 정보형 사이트는 색이 아니라 정렬·위계로 읽혀야 하므로 price/time/updated 도 전부 중립이다.
// 색은 globals.css 의 토큰에서만 온다(여기 하드코딩 hex 없음).
export type BadgeVariant =
  | "default" | "price" | "time" | "updated" | "source" | "official" | "warning";

const _STYLE: Record<BadgeVariant, string> = {
  default: "bg-badge text-badge-ink",
  price: "bg-badge text-badge-ink",
  time: "bg-badge text-badge-ink",
  updated: "bg-badge text-badge-ink",
  source: "bg-source text-source-ink",
  official: "bg-source text-source-ink",
  warning: "bg-accent-soft text-accent-ink",
};

// 구버전 tone 호환 매핑(accent/muted → 중립, trust → 출처 블루). 새 코드는 variant 사용.
const _TONE: Record<string, BadgeVariant> = { accent: "default", muted: "default", trust: "official" };

export default function Badge({
  children,
  variant,
  tone,
  size = "sm",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  tone?: "accent" | "trust" | "muted";
  size?: "sm" | "md";
}) {
  const v: BadgeVariant = variant || (tone ? _TONE[tone] : "default");
  const sz = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ${sz} ${_STYLE[v]}`}
    >
      {children}
    </span>
  );
}
