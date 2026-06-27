import TransportIcon, { stopKind } from "@/components/TransportIcon";

// 경로 스트립 "ICN → AREX → Seoul Station → Hotel" — 작은 SVG 아이콘 + 화살표(정보보다 안 튀게).
export default function RouteStrip({ stops }: { stops: string[] }) {
  if (!stops || stops.length === 0) return null;
  return (
    <div
      className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink"
      aria-label={`Route: ${stops.join(" to ")}`}
    >
      {stops.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span aria-hidden className="text-accent">
              →
            </span>
          ) : null}
          <TransportIcon
            kind={stopKind(s)}
            className="h-4 w-4 shrink-0 text-ink-muted"
          />
          <span>{s}</span>
        </span>
      ))}
    </div>
  );
}
