// 가이드 상태 배지 — live>0 이면 LIVE n · SOON m, live=0 이면 COMING SOON. 데이터 기반.
export default function StatusBadge({ live, soon }: { live: number; soon: number }) {
  if (live > 0) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent-ink">
        LIVE {live}
        {soon ? ` · SOON ${soon}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
      COMING SOON{soon ? ` · ${soon}` : ""}
    </span>
  );
}
