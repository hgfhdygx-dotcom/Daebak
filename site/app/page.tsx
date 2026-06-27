import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, getHomeCategories, getSiteFeatured } from "@/lib/posts";
import AnswerCard from "@/components/AnswerCard";
import CategoryCard from "@/components/CategoryCard";
import PopularGuides from "@/components/PopularGuides";
import ExploreByPlace from "@/components/ExploreByPlace";
import ExploreByNeed from "@/components/ExploreByNeed";
import MostAsked from "@/components/MostAsked";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

const INTRO =
  "Hi — I'm a Korean local, and Daebak is my English guide to Korea for foreigners. " +
  "Clear answers on travel, food, K-beauty, K-fashion, and shopping — with real prices, " +
  "times, and trusted sources.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Daebak — Discover Korea",
  description: INTRO,
  openGraph: { title: "Daebak — Discover Korea", description: INTRO, type: "website" },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Daebak — Discover Korea",
  url: SITE_URL,
  inLanguage: "en",
  description: INTRO,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
  publisher: {
    "@type": "Person",
    name: "kor_punch_boy",
    description: "A local Korean helping foreigners discover Korea.",
    url: INSTAGRAM,
    sameAs: [INSTAGRAM],
  },
};

// 검색 예시 칩(4개) — UI 로직 아님, 단순 검색 시드.
const EXAMPLES = [
  "Incheon Airport to Seoul",
  "Best Korean sunscreen",
  "What to buy in Korea",
  "Korean BBQ in Gangnam",
];
const TRUST = ["Local perspective", "Updated guides", "Cited sources"];

export default function Home() {
  const posts = getAllPosts();
  const featured = getSiteFeatured(); // 대표글(featured/priority 우선) — 최신글이 아님
  const popular = posts.filter((p) => p.slug !== featured?.slug).slice(0, 4);
  const homeCats = getHomeCategories();
  const popularNow = posts.slice(0, 4).map((p) => ({
    label: p.question || p.title,
    href: `/answers/${p.slug}`,
  }));

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-8 sm:px-6 lg:px-8">
      <JsonLd data={websiteLd} />

      {/* ── Hero: 여행 느낌(soft gradient) + 검색 + Popular now ── */}
      <section className="relative mt-5 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-section to-[#eef3ff] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        {/* 부드러운 지도 점 장식(이미지 없이 여행 느낌) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "16px 16px", color: "#2563eb" }}
        />
        <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">
              Daebak · Korea, discovered
            </p>
            <h1 className="mt-2 max-w-xl font-display text-[clamp(2rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-tight">
              Discover Korea with local answers.
            </h1>
            <p className="mt-2.5 max-w-xl text-base leading-relaxed text-ink-muted">
              Simple guides for transport, food, beauty, shopping, and places.
            </p>

            <form action="/search" role="search" className="mt-4 max-w-xl">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-sm focus-within:border-accent">
                <span aria-hidden className="text-base text-ink-muted">🔍</span>
                <input
                  name="q"
                  type="search"
                  placeholder="Ask about Korea travel, food, shopping, or beauty…"
                  aria-label="Ask about Korea"
                  className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <Link
                  key={e}
                  href={`/search?q=${encodeURIComponent(e)}`}
                  className="rounded-full border border-line bg-surface/80 px-3 py-1 text-[0.8rem] text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
                >
                  {e}
                </Link>
              ))}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-ink-muted">
              {TRUST.map((t, i) => (
                <span key={t} className="flex items-center gap-2.5">
                  {i > 0 ? <span aria-hidden className="text-line">·</span> : null}
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="text-trust">✓</span>
                    {t}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <MostAsked items={popularNow} title="Popular now" />
        </div>
      </section>

      {/* ── Featured answer (범용 카드: 인텐트 라벨 자동) ── */}
      {featured ? (
        <section className="mt-6">
          <AnswerCard post={featured} variant="featured" />
        </section>
      ) : null}

      {/* ── Browse by category (hover 시 하위분류 pill) ── */}
      <section id="categories" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-lg font-bold tracking-tight">Browse Korea by category</h2>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {homeCats.map((c) => (
            <CategoryCard key={c.slug} cat={c} />
          ))}
        </div>
      </section>

      {/* ── Popular local guides ── */}
      <PopularGuides posts={popular} />

      {/* ── Explore by place / by need ── */}
      <ExploreByPlace />
      <ExploreByNeed />

      {/* ── Product teaser + For Brands (하단·부드럽게) ── */}
      <section id="for-brands" className="mt-10 grid scroll-mt-20 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-line bg-section p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            Korean product guides
          </p>
          <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight">
            What to actually buy in Korea.
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Honest, sourced picks — K-beauty, fashion, snacks, gifts.
          </p>
          <Link
            href="/search?q=what+to+buy+in+Korea"
            className="mt-3 inline-flex w-fit rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white"
          >
            Ask what to buy →
          </Link>
        </div>

        {/* For Brands — 보조 CTA(부드러운 톤) */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            Ask · or list your brand
          </p>
          <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight">
            A question, or a Korean brand to share?
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Got a question, or a Korean brand to put in front of foreigners? Just DM me.
          </p>
          <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-auto inline-flex w-fit pt-3">
            <span className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Message on Instagram
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
