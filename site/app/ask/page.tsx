import type { Metadata } from "next";
import AskDaebak from "@/components/AskDaebak";

export const metadata: Metadata = {
  title: "Ask Daebak",
  description: "Ask a question about buying, shopping, or getting around Korea.",
  robots: { index: false, follow: true },
};

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-[680px] px-5 py-12 sm:px-8 lg:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Ask Daebak</p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.8rem)] font-bold leading-[1.08] tracking-tight">
        Can&apos;t find your answer?
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        Ask anything about what to buy, where to buy it, or how to get around Korea. We review real
        questions to build better guides — and may answer yours. No login required.
      </p>
      <div className="mt-6">
        <AskDaebak initialQuestion={q || ""} sourceComponent="ask_page" />
      </div>
    </div>
  );
}
