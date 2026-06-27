import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

// 검색 — 서버에서 질문/제목/요약을 필터(클라 JS 불필요). 검색 페이지는 색인 제외.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const results = query
    ? getAllPosts().filter((p) =>
        `${p.question || ""} ${p.title} ${p.summary || ""}`
          .toLowerCase()
          .includes(query),
      )
    : [];

  return (
    <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-2xl font-bold tracking-tight">Search</h1>

      <form action="/search" className="mt-4" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search Seoul, food, transport…"
          aria-label="Search Korea guides"
          className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-base text-ink outline-none focus:border-accent"
        />
      </form>

      {query ? (
        <p className="mt-6 text-sm text-ink-muted">
          {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
        </p>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          Type a question — e.g. “airport to Seoul”, “SIM card”, “visa”.
        </p>
      )}

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {results.map((p) => (
          <li key={p.slug}>
            <Link href={`/answers/${p.slug}`} className="group block py-4">
              <span className="font-display text-lg font-medium transition-colors group-hover:text-accent-ink">
                {p.question || p.title}
              </span>
              {p.summary ? (
                <span className="mt-1 block text-sm text-ink-muted">
                  {p.summary}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
