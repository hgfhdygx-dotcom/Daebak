import type { Metadata } from "next";
import Link from "next/link";
import AskSubmitForm from "@/components/AskSubmitForm";
import PublicAskCard from "@/components/PublicAskCard";
import SectionBand from "@/components/SectionBand";
import { getPublicAsks } from "@/lib/questions";

export const dynamic = "force-dynamic"; // 공개 목록 + Good 수 실시간

const INTRO =
  "Ask anything useful, weird, or oddly specific about Korea. Daebak reviews real questions and turns the best ones into public answers.";

export const metadata: Metadata = {
  title: "Ask Daebak",
  description: INTRO,
  openGraph: { title: "Ask Daebak", description: INTRO, type: "website" },
};

function tab(active: boolean): string {
  return (
    "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors " +
    (active ? "bg-accent text-white" : "text-ink-muted hover:text-accent-ink")
  );
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const s: "good" | "latest" = sort === "latest" ? "latest" : "good";
  const asks = await getPublicAsks(s);

  return (
    <>
      <SectionBand variant="gradient" className="pt-8 pb-8 sm:pt-10">
        <div className="max-w-2xl">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-accent-ink">
            For foreigners in Korea
          </p>
          <h1 className="mt-2.5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] tracking-tight text-ink">
            Ask Daebak
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">{INTRO}</p>
        </div>
        <div className="mt-6 max-w-2xl">
          <AskSubmitForm />
        </div>
      </SectionBand>

      <SectionBand variant="white" className="py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Public Daebak Questions</h2>
          <div className="inline-flex rounded-full border border-line bg-surface p-0.5">
            <Link href="/ask?sort=good" className={tab(s === "good")}>
              Most Good
            </Link>
            <Link href="/ask?sort=latest" className={tab(s === "latest")}>
              Latest
            </Link>
          </div>
        </div>

        {asks.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {asks.map((a) => (
              <PublicAskCard key={a.slug} ask={a} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-line bg-section p-6 text-sm leading-relaxed text-ink-muted">
            No public questions yet. Ask one above — if Daebak selects yours, it shows up here. Vote with
            Good if you want Daebak to answer more questions like this.
          </p>
        )}
      </SectionBand>
    </>
  );
}
