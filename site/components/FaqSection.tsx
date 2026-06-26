import type { Faq } from "@/lib/posts";

// FAQ 섹션(보이는 본문). FAQPage JSON-LD는 페이지에서 별도로 방출한다.
export default function FaqSection({ items }: { items: Faq[] }) {
  return (
    <section className="mt-12" aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="font-display text-2xl font-semibold tracking-tight"
      >
        Frequently asked questions
      </h2>
      <dl className="mt-5 divide-y divide-line border-t border-line">
        {items.map((f, i) => (
          <div key={i} className="py-5">
            <dt className="text-lg font-medium">{f.q}</dt>
            <dd className="mt-2 leading-relaxed text-ink-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
