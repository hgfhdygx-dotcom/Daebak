import ClusterIcon from "@/components/ClusterIcon";

// 카테고리 허브 Hero — LABEL + heroTitle + subtitle + stats(live/soon/topics) + 부드러운 비주얼(이미지 X).
export default function CategoryHero({
  label,
  title,
  subtitle,
  stats,
  icon,
  tint,
}: {
  label: string;
  title: string;
  subtitle?: string;
  stats: { live: number; soon: number; topics: number };
  icon: string;
  tint: string;
}) {
  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface to-section px-5 py-7 sm:px-8 sm:py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full opacity-[0.08]"
        style={{ backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "15px 15px", color: "var(--color-accent)" }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">{label}</p>
          <h1 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.1] tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-base leading-relaxed text-ink-muted">{subtitle}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span>
              <b className="text-ink">{stats.live}</b> guides
            </span>
            <span>
              <b className="text-ink">{stats.soon}</b> coming soon
            </span>
            <span>
              <b className="text-ink">{stats.topics}</b> topics
            </span>
          </div>
        </div>
        <span
          className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-accent-ink sm:inline-flex"
          style={{ backgroundColor: tint }}
        >
          <ClusterIcon kind={icon} className="h-9 w-9" />
        </span>
      </div>
    </section>
  );
}
