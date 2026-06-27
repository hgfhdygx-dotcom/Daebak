import type { Faq } from "@/lib/posts";

// FAQ 아코디언 — 질문만 먼저 보이고 클릭하면 답이 열림. 네이티브 <details>라 JS 없이 동작하고
// 답변 텍스트가 DOM에 그대로 있어 AI 크롤러도 읽는다(GEO 유지).
export default function FaqSection({ items }: { items: Faq[] }) {
  return (
    <section className="mt-12" aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="font-display text-2xl font-semibold tracking-tight"
      >
        Frequently asked questions
      </h2>
      <div className="mt-4 divide-y divide-line border-t border-line">
        {items.map((f, i) => (
          <details key={i} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span
                aria-hidden
                className="shrink-0 text-xl leading-none text-accent transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-5 leading-relaxed text-ink-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
