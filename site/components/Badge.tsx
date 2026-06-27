import type { ReactNode } from "react";

// 숫자/메트릭 강조용 알약. tone: accent(코랄)·trust(블루)·muted. size: sm·md.
export default function Badge({
  children,
  tone = "accent",
  size = "sm",
}: {
  children: ReactNode;
  tone?: "accent" | "trust" | "muted";
  size?: "sm" | "md";
}) {
  const color =
    tone === "trust"
      ? "bg-trust/10 text-trust"
      : tone === "muted"
        ? "bg-ink/[0.06] text-ink-muted"
        : "bg-accent/10 text-accent-ink";
  const sz = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ${sz} ${color}`}
    >
      {children}
    </span>
  );
}
