// 메타 라인: 작성자 · Last updated · 읽는 시간.
function fmt(d?: string): string {
  if (!d) return "";
  // "2026-06" 또는 "2026-06-26" 모두 허용.
  const iso = d.length === 7 ? `${d}-01` : d;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  const opts: Intl.DateTimeFormatOptions =
    d.length === 7
      ? { year: "numeric", month: "long" }
      : { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", opts);
}

export default function MetaLine({
  author,
  updated,
  minutes,
}: {
  author?: string;
  updated?: string;
  minutes: number;
}) {
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
      {author ? (
        <>
          <span>{author}</span>
          <span aria-hidden>·</span>
        </>
      ) : null}
      {updated ? (
        <>
          <span>
            Last updated: <time dateTime={updated}>{fmt(updated)}</time>
          </span>
          <span aria-hidden>·</span>
        </>
      ) : null}
      <span>{minutes} min read</span>
    </p>
  );
}
