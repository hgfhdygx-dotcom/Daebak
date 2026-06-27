// 가이드 상태 배지 — 여행자 친화 문구(관리자 LIVE/SOON 대신). 데이터(live/soon) 기반·중립 색(토큰).
export default function StatusBadge({ live, soon }: { live: number; soon: number }) {
  if (live > 0) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-badge px-2.5 py-1 text-[0.68rem] font-semibold text-badge-ink">
        {live} guide{live > 1 ? "s" : ""}
        {soon ? <span className="text-ink-soft">{` · ${soon} coming`}</span> : null}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-semibold text-ink-muted">
      Coming soon
    </span>
  );
}
