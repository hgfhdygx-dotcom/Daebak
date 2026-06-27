import AtAGlance from "@/components/AtAGlance";
import Badge from "@/components/Badge";
import type { Post } from "@/lib/posts";

// 단계형 답변(how-to / route / planning) — steps 있으면 번호 목록, 없으면 핵심 배지로 폴백.
export default function StepsTemplate({ post }: { post: Post }) {
  const answer = post.citationPack?.answer || post.summary || "";
  const glance = post.atAGlance || [];
  const steps = post.steps || [];
  const highlights = (post.highlights || []).filter((h) => String(h).trim()).slice(0, 4);
  if (!answer && glance.length === 0 && steps.length === 0 && highlights.length === 0) return null;

  return (
    <>
      <AtAGlance items={glance} />
      <section
        aria-label="How to"
        className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            {steps.length ? "Step by step" : "How it works"}
          </p>
          {answer ? (
            <p className="mt-2 text-lg font-medium leading-relaxed text-ink">{answer}</p>
          ) : null}
          {steps.length > 0 ? (
            <ol className="mt-3.5 space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[0.7rem] font-bold text-accent-ink">
                    {i + 1}
                  </span>
                  <span className="text-ink-muted">{s}</span>
                </li>
              ))}
            </ol>
          ) : highlights.length > 0 ? (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {highlights.map((h, i) => (
                <Badge key={i}>{h}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
