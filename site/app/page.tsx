import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-static";

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-5 pb-10 pt-16 sm:px-8 lg:pb-14 lg:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Korea, answered
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,6vw,4rem)] font-bold leading-[1.0] tracking-tight">
          Straight answers to what foreigners ask about Korea.
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-relaxed text-ink-muted">
          Prices, times, and rules — each one researched, cited, and dated.
          Updated, not guessed.
        </p>
      </section>

      {/* Answers list */}
      <section className="mx-auto max-w-[1120px] border-t border-line px-5 py-10 sm:px-8 lg:py-14">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {posts.length > 0 ? "Latest answers" : "No answers yet"}
        </h2>

        {posts.length === 0 ? (
          <p className="mt-6 text-ink-muted">
            No answers published yet. Generate one with the foreign-qa app and
            click <strong>OK 발행</strong>.
          </p>
        ) : (
          <ul className="mt-6 border-t border-line">
            {posts.map((p) => (
              <li key={p.slug} className="border-b border-line">
                <Link href={`/answers/${p.slug}`} className="group block py-6">
                  <span className="font-display text-xl font-medium leading-snug tracking-tight transition-colors group-hover:text-accent-ink sm:text-2xl">
                    {p.question || p.title}
                  </span>
                  {p.summary ? (
                    <span className="mt-2 block max-w-3xl leading-relaxed text-ink-muted">
                      {p.summary}
                    </span>
                  ) : null}
                  {p.datePublished ? (
                    <span className="mt-2 block text-xs text-ink-muted">
                      {p.datePublished}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
