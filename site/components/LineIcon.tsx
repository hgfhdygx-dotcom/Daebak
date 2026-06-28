// 미니멀 라인 아이콘(Lucide 스타일) — 이모지 대체. stroke=currentColor, 24x24, round.
// UI 크롬용(검색/체크/메뉴/화살표 등). 카테고리/교통 아이콘은 ClusterIcon 사용.
type Name =
  | "search"
  | "check"
  | "menu"
  | "arrow-right"
  | "arrow-up-right"
  | "compass"
  | "map-pin"
  | "sparkles"
  | "clock"
  | "shield-check"
  | "external"
  | "info"
  | "alert";

const PATHS: Record<Name, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  sparkles: <path d="M12 3v6m0 6v6m9-9h-6m-6 0H3m13.5-6.5-4 4m-3 3-4 4m11 0-4-4m-3-3-4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M12 3 5 6v5c0 4.2 2.9 7.2 7 8 4.1-.8 7-3.8 7-8V6z" />
      <path d="m9 11.5 2 2 4-4" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
};

export default function LineIcon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.75,
}: {
  name: Name;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
