// 카테고리용 간단한 인라인 SVG 라인 아이콘 (currentColor·stroke).
export type CatKind =
  | "travel"
  | "food"
  | "beauty"
  | "fashion"
  | "shopping"
  | "rules"
  | "places"
  | "products";

export default function CategoryIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: CatKind;
  className?: string;
}) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  switch (kind) {
    case "travel": // 나침반
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M15 9l-1.6 4.4L9 15l1.6-4.4z" />
        </svg>
      );
    case "food": // 그릇 + 김
      return (
        <svg {...p}>
          <path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" />
          <path d="M9 4c0 1.4-1 1.4-1 2.8M13 4c0 1.4-1 1.4-1 2.8" />
        </svg>
      );
    case "beauty": // 물방울
      return (
        <svg {...p}>
          <path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3z" />
        </svg>
      );
    case "fashion": // 티셔츠
      return (
        <svg {...p}>
          <path d="M8.5 4 4 7l2 2.2 1.4-1V20h9.2V8.2l1.4 1L21 7l-4.5-3-1.6 1.4a3.3 3.3 0 0 1-4.8 0z" />
        </svg>
      );
    case "shopping": // 쇼핑백
      return (
        <svg {...p}>
          <path d="M6 8h12l-1 11.5H7z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );
    case "rules": // 문서
      return (
        <svg {...p}>
          <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "places": // 핀
      return (
        <svg {...p}>
          <path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case "products": // 박스
    default:
      return (
        <svg {...p}>
          <path d="M12 3 4 7v10l8 4 8-4V7z" />
          <path d="M4 7l8 4 8-4M12 11v10" />
        </svg>
      );
  }
}
