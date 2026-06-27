import Badge from "@/components/Badge";
import TransportIcon, { vehicleKind } from "@/components/TransportIcon";
import type { ParsedTable } from "@/lib/markdownTable";

// 4옵션 비교 — 중립 디자인(흰 카드, 헤더만 연한 회색, 행 배경색 없음).
// PC=표(모든 열 보이게, 셀 줄바꿈) / 모바일=카드(흰색). 가격·시간은 굵은 텍스트/중립 뱃지로만.
export default function ComparisonBlock({ table }: { table: ParsedTable }) {
  const { headers, rows } = table;
  if (!rows.length) return null;
  const find = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const c = {
    title: 0,
    time: find(/time|\bmin\b|hour|duration|소요|기간/i),
    price: find(/price|fare|cost|won|krw|₩|가격|요금/i),
    best: find(/best/i),
    pros: find(/pros|good|why|장점/i),
    watch: find(/watch|caution|con\b|note|주의|단점/i),
  };

  return (
    <section className="mt-6" aria-label="Compare your options">
      {/* 데스크톱: 표(중립) */}
      <div className="hidden rounded-2xl border border-line bg-surface sm:block">
        <table className="w-full table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-th text-left">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-line px-3 py-2.5 font-semibold text-ink"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-line align-top last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-3 text-ink [overflow-wrap:anywhere]"
                  >
                    {j === c.title ? (
                      <span className="inline-flex items-start gap-1.5 font-medium">
                        <TransportIcon
                          kind={vehicleKind(row[c.title])}
                          className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                        />
                        <span>{cell}</span>
                      </span>
                    ) : j === c.time || j === c.price ? (
                      <span className="font-semibold text-ink">{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드(흰색) */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <TransportIcon
                kind={vehicleKind(row[c.title])}
                className="h-6 w-6 shrink-0 text-ink-muted"
              />
              <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">
                {row[c.title]}
              </h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.time >= 0 && row[c.time] ? (
                <Badge tone="muted">{row[c.time]}</Badge>
              ) : null}
              {c.price >= 0 && row[c.price] ? (
                <Badge tone="muted">{row[c.price]}</Badge>
              ) : null}
            </div>
            {c.best >= 0 && row[c.best] ? (
              <p className="mt-2.5 text-sm text-ink">
                <span className="font-medium text-accent-ink">Best for: </span>
                {row[c.best]}
              </p>
            ) : null}
            {c.pros >= 0 && row[c.pros] ? (
              <p className="mt-1.5 text-sm text-ink">
                <span aria-hidden className="text-accent">✓ </span>
                {row[c.pros]}
              </p>
            ) : null}
            {c.watch >= 0 && row[c.watch] ? (
              <p className="mt-1.5 text-sm text-ink-muted">
                <span aria-hidden>⚠ </span>
                {row[c.watch]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
