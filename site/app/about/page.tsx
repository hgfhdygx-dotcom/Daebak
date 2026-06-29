import type { Metadata } from "next";
import { AUTHOR_NAME, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About",
  description: `How ${SITE_NAME} researches and writes its answers.`,
  alternates: { canonical: `${SITE_URL}/about` },
};

// 권위 신호(F-3): 실재하는 주체·작성 책임·교정 정책.
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[680px] px-5 py-12 sm:px-8 lg:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        About
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.1rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
        About {SITE_NAME}
      </h1>

      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-accent-ink">
        <p>
          {SITE_NAME} publishes researched, source-cited answers to practical
          questions that foreigners ask about living in, working in, or visiting
          Korea.
        </p>

        <h2>How we research</h2>
        <p>
          Every article starts from a single real question. We gather facts using
          official web search, cite the primary sources we relied on, and write an
          answer-first summary. We do not invent prices, dates, fees, or
          statistics; anything we cannot verify is flagged for review before
          publishing.
        </p>

        <h2>Editor</h2>
        <p>
          Written and reviewed by <strong>{AUTHOR_NAME}</strong>. Found something
          out of date or incorrect? Tell us and we will update the article — every
          page shows its last-updated date.
        </p>

        <h2>Corrections &amp; freshness</h2>
        <p>
          We keep answers current and revise them when the underlying facts change.
          We never publish fabricated reviews, awards, or claims.
        </p>

        <h2>Images &amp; visuals</h2>
        <p>
          {SITE_NAME} uses{" "}
          <a href="https://unsplash.com/?utm_source=daebak&utm_medium=referral" target="_blank" rel="noreferrer">
            Unsplash
          </a>{" "}
          photos as supporting visuals for major categories and topic clusters —
          such as Travel, Food, K-Beauty, Shopping, Airport &amp; Arrival, and Seoul
          Transport. Small Q&amp;A answer cards do not use large photos by default.
          Each image is chosen through our admin Image Manager, hotlinked from
          Unsplash, and shown with photographer attribution (&ldquo;Photo by
          [photographer] on Unsplash&rdquo;) next to where it appears.
        </p>
      </div>
    </div>
  );
}
