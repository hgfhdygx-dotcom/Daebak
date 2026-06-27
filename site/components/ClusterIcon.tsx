import type { ReactNode } from "react";
import CategoryIcon, { type CatKind } from "@/components/CategoryIcon";
import TransportIcon, { type IconKind } from "@/components/TransportIcon";

// 데이터 기반 클러스터 아이콘. 기존 TransportIcon/CategoryIcon 재사용 + 없는 8종 추가, 미지 키는 폴백.
const TRANSPORT = new Set(["train", "subway", "bus", "taxi", "plane", "station", "pin"]);
const CATEGORY = new Set(["travel", "food", "beauty", "fashion", "shopping", "rules", "places", "products"]);

const NEW_ICONS: Record<string, ReactNode> = {
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  sim: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="2" />
      <path d="M10 18h4" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18v-6h11a4 4 0 0 1 4 4v2" />
      <path d="M3 14h18M21 18v-4" />
      <circle cx="7" cy="10.5" r="1.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z" />,
  chat: <path d="M5 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4V5a1 1 0 0 1 1-1z" />,
  island: (
    <>
      <path d="M3 19h18" />
      <path d="M6.5 19c2-4.5 9-4.5 11 0" />
      <path d="M12 14V8.5" />
      <path d="M12 8.5c2.2 0 3.3-1.1 3-2.5-1.8-.3-3 .4-3 2.5zM12 8.5c-2.2 0-3.3-1.1-3-2.5 1.8-.3 3 .4 3 2.5z" />
    </>
  ),
};

export default function ClusterIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind?: string;
  className?: string;
}) {
  const k = (kind || "").toLowerCase();
  if (TRANSPORT.has(k)) return <TransportIcon kind={k as IconKind} className={className} />;
  if (CATEGORY.has(k)) return <CategoryIcon kind={k as CatKind} className={className} />;
  const body = NEW_ICONS[k];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {body ?? <circle cx="12" cy="12" r="3.5" />}
    </svg>
  );
}
