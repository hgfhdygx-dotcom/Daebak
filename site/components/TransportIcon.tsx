// 교통수단·경로용 인라인 SVG 라인 아이콘. 이모지 대신 일관된 벡터(기기 독립·추가 로딩 0).
export type IconKind =
  | "train"
  | "subway"
  | "bus"
  | "taxi"
  | "plane"
  | "station"
  | "pin";

// 옵션 이름 → 교통수단(공항 리무진 '버스'를 비행기로 오인하지 않도록 차량 우선).
export function vehicleKind(name: string): IconKind {
  const n = (name || "").toLowerCase();
  if (/taxi|cab|uber/.test(n)) return "taxi";
  if (/bus|limousine|limo|coach|shuttle/.test(n)) return "bus";
  if (/all-stop|all stop|commuter|subway|metro/.test(n)) return "subway";
  return "train";
}

// 경로 정류장 이름 → 장소/이동수단 아이콘.
export function stopKind(s: string): IconKind {
  const n = (s || "").toLowerCase();
  if (/airport|incheon|\bicn\b|flight|plane/.test(n)) return "plane";
  if (/station/.test(n)) return "station";
  if (/hotel|stay|home|accommodation|destination/.test(n)) return "pin";
  if (/bus|limousine/.test(n)) return "bus";
  if (/taxi|cab/.test(n)) return "taxi";
  if (/all-stop|commuter|subway|metro/.test(n)) return "subway";
  if (/arex|express|\btrain\b|rail/.test(n)) return "train";
  return "pin";
}

export default function TransportIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: IconKind;
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
    case "taxi":
      return (
        <svg {...p}>
          <path d="M4 13.5 5.4 9.4A2.2 2.2 0 0 1 7.5 8h9a2.2 2.2 0 0 1 2.1 1.4L20 13.5" />
          <path d="M3.5 13.5h17v3.2a1 1 0 0 1-1 1h-1.4M6 17.7H4.5a1 1 0 0 1-1-1v-3.2" />
          <rect x="9.2" y="4.4" width="5.6" height="3" rx="0.7" />
          <circle cx="7.6" cy="17.6" r="1.7" />
          <circle cx="16.4" cy="17.6" r="1.7" />
        </svg>
      );
    case "bus":
      return (
        <svg {...p}>
          <rect x="5" y="3.5" width="14" height="14" rx="2.6" />
          <path d="M5 12h14" />
          <rect x="7.5" y="6" width="9" height="3.4" rx="0.8" />
          <path d="M7 17.5 6 20M17 17.5 18 20" />
        </svg>
      );
    case "subway":
      // 지하철/완행 = 측면 차량(창문 3개) — 정면 기차와 구분되되 둘 다 '철도'로 읽힘.
      return (
        <svg {...p}>
          <rect x="3" y="6" width="18" height="9.5" rx="2" />
          <rect x="5.6" y="8.2" width="3" height="3" rx="0.5" />
          <rect x="10.5" y="8.2" width="3" height="3" rx="0.5" />
          <rect x="15.4" y="8.2" width="3" height="3" rx="0.5" />
          <path d="M6.5 15.5 5.5 18M17.5 15.5 18.5 18" />
        </svg>
      );
    case "train":
      // 급행/기차 = 정면 노즈.
      return (
        <svg {...p}>
          <rect x="6" y="3.3" width="12" height="14" rx="3.2" />
          <path d="M6 9.5h12" />
          <circle cx="9.4" cy="13.2" r="0.9" />
          <circle cx="14.6" cy="13.2" r="0.9" />
          <path d="M8.6 17.3 7 20M15.4 17.3 17 20" />
        </svg>
      );
    case "plane":
      return (
        <svg {...p}>
          <path
            fill="currentColor"
            stroke="none"
            d="M11 3.2a1 1 0 0 1 2 0V11l8 4.6v1.7l-8-2.3v3.5l2 1.4v1.3l-3-.9-3 .9v-1.3l2-1.4v-3.5l-8 2.3v-1.7L11 11z"
          />
        </svg>
      );
    case "station":
      return (
        <svg {...p}>
          <path d="M4 9 12 4l8 5" />
          <path d="M6 9v9h12V9" />
          <path d="M9.5 18v-3.6h5V18" />
        </svg>
      );
    case "pin":
    default:
      return (
        <svg {...p}>
          <path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21z" />
          <circle cx="12" cy="10.2" r="2.4" />
        </svg>
      );
  }
}
