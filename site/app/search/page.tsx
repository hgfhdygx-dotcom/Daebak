import type { Metadata } from "next";
import Link from "next/link";
import AnswerCard from "@/components/AnswerCard";
import AskDaebak from "@/components/AskDaebak";
import SearchBar from "@/components/SearchBar";
import SectionBand from "@/components/SectionBand";
import LineIcon from "@/components/LineIcon";
import { distinctCardIcons } from "@/lib/cardIntent";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const SUGGESTIONS = [
  "Olive Young must-buys",
  "Best Korean sunscreen",
  "Can foreigners use Coupang?",
  "WOWPASS vs T-money",
];

function Suggestions({ heading }: { heading: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{heading}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Link
            key={s}
            href={`/search?q=${encodeURIComponent(s)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
          >
            <LineIcon name="search" className="h-3.5 w-3.5 text-ink-soft" />
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}

// 검색 — 서버 필터(클라 JS 불필요 → loading/error 상태 없음). sky 헤더 + 결과 그리드 + 빈/무결과 상태.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const results = query
    ? getAllPosts().filter((p) =>
        `${p.question || ""} ${p.title} ${p.summary || ""}`.toLowerCase().includes(query),
      )
    : [];
  const resultIcons = distinctCardIcons(results);

  return (
    <>
      {/* sky 헤더 — 제목 + 검색바 + 결과 개수 */}
      <SectionBand variant="gradient" className="pt-7 pb-7 sm:pt-9 sm:pb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {query ? "Search results" : "Search Korea guides"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          What to buy, where to buy it, and how to get around Korea — sourced answers.
        </p>
        <SearchBar
          className="mt-5 max-w-2xl"
          defaultValue={q}
          placeholder="Search airport, subway, food, places…"
          autoFocus
        />
        {query ? (
          <p className="mt-3 text-sm font-medium text-ink-muted">
            <span className="text-ink">{results.length}</span> guide{results.length === 1 ? "" : "s"}{" "}
            found for “{q}”
          </p>
        ) : null}
      </SectionBand>

      {/* 결과 / 상태 */}
      <SectionBand variant="white" className="py-8">
        {!query ? (
          <Suggestions heading="Try a popular search" />
        ) : results.length ? (
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p, i) => (
                <AnswerCard key={p.slug} post={p} variant="list" icon={resultIcons[i]} />
              ))}
            </div>
            {/* 결과가 있어도 '딱 그건 아니면' 질문 유도(검색 + 질문 둘 다) */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-section px-5 py-4">
              <p className="text-sm text-ink-muted">Didn&apos;t find exactly what you needed?</p>
              <Link
                href={`/ask?q=${encodeURIComponent(q)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white"
              >
                Ask Daebak
                <LineIcon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            {/* 무결과 → 검색 먼저였고, 이제 질문 수집 */}
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                <LineIcon name="sparkles" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-bold tracking-tight text-ink">
                  We don&apos;t have a clear answer for this yet.
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">Ask Daebak and we may answer it soon.</p>
              </div>
            </div>
            <div className="mt-5">
              <AskDaebak initialQuestion={q} sourceComponent="search_page" sourcePage="/search" />
            </div>
            <div className="mt-6">
              <Suggestions heading="Or try a popular search" />
            </div>
          </div>
        )}
      </SectionBand>
    </>
  );
}
