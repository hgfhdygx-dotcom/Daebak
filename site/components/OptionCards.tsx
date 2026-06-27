import Badge from "@/components/Badge";
import type { ParsedTable } from "@/lib/markdownTable";

function findCol(headers: string[], re: RegExp): number {
  return headers.findIndex((h) => re.test(h));
}

// 비교표 → 옵션 카드: 옵션명=제목, 시간=뱃지, best-for=강조 태그, 나머지=한 줄 설명.
// 표가 있는 글에서만 쓰이며, 본문보다 위로 올려 "선택"을 먼저 보이게 한다.
export default function OptionCards({ table }: { table: ParsedTable }) {
  const { headers, rows } = table;
  if (!rows.length) return null;

  const titleCol = 0;
  const timeCol = findCol(headers, /time|duration|hour|\bmin\b|기간|소요/i);
  const bestCol = findCol(headers, /best|for|when|ideal|recommend|추천/i);

  return (
    <div className="mt-6 space-y-3">
      {rows.map((row, i) => {
        const title = row[titleCol] || "";
        const time = timeCol >= 0 ? row[timeCol] : "";
        const best = bestCol >= 0 ? row[bestCol] : "";
        const others = headers
          .map((_, j) => row[j])
          .filter((_, j) => j !== titleCol && j !== timeCol && j !== bestCol)
          .filter(Boolean);
        return (
          <div
            key={i}
            className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink">
                {title}
              </h3>
              {time ? <Badge>{time}</Badge> : null}
            </div>
            {others.length > 0 ? (
              <p className="mt-1 text-sm text-ink-muted">{others.join(" · ")}</p>
            ) : null}
            {best ? (
              <p className="mt-2.5 text-sm text-ink">
                <span className="font-medium text-accent-ink">Best for: </span>
                {best}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
