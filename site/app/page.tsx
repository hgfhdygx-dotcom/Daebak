import Link from "next/link";
import type { Metadata } from "next";
import { getActiveCategorySlugs, getAllPosts } from "@/lib/posts";
import Badge from "@/components/Badge";
import MostAsked from "@/components/MostAsked";
import CategoryIcon, { type CatKind } from "@/components/CategoryIcon";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

const INTRO =
  "Hi — I'm a Korean local, and Daebak is my English guide to Korea for foreigners. " +
  "Get clear answers on travel, food, K-beauty, K-fashion, and shopping — with real prices, " +
  "times, and trusted sources, so you know exactly what to do, buy, and expect in Korea.";

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
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
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

const EXAMPLES = [
  "Incheon Airport to Seoul",
  "Best Korean sunscreen",
  "What to buy in Korea",
  "Korean BBQ in Gangnam",
  "Olive Young must-buys",
];

const TRUST = ["Researched", "Cited", "Updated", "Local Korean perspective"];

const MOST_ASKED = [
  { label: "Incheon Airport to Seoul", href: "/answers/incheon-airport-to-seoul" },
  { label: "Best Korean sunscreen", href: "/search?q=Korean+sunscreen" },
  { label: "What to buy in Korea", href: "/search?q=what+to+buy+in+Korea" },
  { label: "Korean fashion online", href: "/search?q=Korean+fashion+online" },
];

const CATEGORIES: {
  label: string;
  blurb: string;
  q: string;
  slug: string;
  kind: CatKind;
  tint: string;
}[] = [
  { label: "Travel", blurb: "Airports, transport, hotels", q: "travel transport", slug: "travel", kind: "travel", tint: "#F4F7FF" },
  { label: "Food", blurb: "Restaurants, dishes, tips", q: "food restaurant", slug: "food", kind: "food", tint: "#FCF9EE" },
  { label: "K-Beauty", blurb: "Skincare, sunscreen, Olive Young", q: "beauty skincare", slug: "k-beauty", kind: "beauty", tint: "#FCF4F7" },
  { label: "K-Fashion", blurb: "Brands, streetwear, shops", q: "fashion", slug: "k-fashion", kind: "fashion", tint: "#F7F4FC" },
  { label: "Shopping", blurb: "Gifts, snacks, where to buy", q: "shopping buy", slug: "shopping", kind: "shopping", tint: "#FCF5EE" },
  { label: "Korean Rules", blurb: "Etiquette, payments, apps", q: "rules etiquette", slug: "korean-rules", kind: "rules", tint: "#F5F4F1" },
  { label: "Local Places", blurb: "Neighborhoods, spots, gems", q: "places neighborhood", slug: "local-places", kind: "places", tint: "#F1F7F3" },
  { label: "Products", blurb: "Beauty, fashion, snacks, gifts", q: "product", slug: "products", kind: "products", tint: "#F1F8F3" },
];

function fmtDate(d?: string): string {
  if (!d) return "";
  const iso = d.length === 7 ? `${d}-01` : d;
  const dt = new Date(`${iso}T00:00:00`);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Home() {
  const posts = getAllPosts();
  const featured = posts[0];
  const activeCats = new Set(getActiveCategorySlugs());

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-6 sm:px-6 lg:px-8">
      <JsonLd data={websiteLd} />

      {/* ── Row 2: Hero + Most asked (compact) ── */}
      <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-section px-5 py-6 sm:px-8 sm:py-7 lg:px-9">
        <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">
              Daebak · Korea, discovered
            </p>
            <h1 className="mt-2 max-w-xl font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-bold leading-[1.1] tracking-tight">
              Discover Korea, the easy way.
            </h1>
            <p className="mt-2.5 max-w-xl text-base leading-relaxed text-ink-muted">
              Local answers with prices, times, and trusted sources.
            </p>

            <form action="/search" role="search" className="mt-4 max-w-xl">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-accent">
                <span aria-hidden className="text-base text-ink-muted">
                  🔍
                </span>
                <input
                  name="q"
                  type="search"
                  placeholder="Ask anything about Korea…"
                  aria-label="Ask anything about Korea"
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
                  className="rounded-full border border-line bg-surface px-3 py-1 text-[0.8rem] text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
                >
                  {e}
                </Link>
              ))}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-ink-muted">
              {TRUST.map((t, i) => (
                <span key={t} className="flex items-center gap-2.5">
                  {i > 0 ? (
                    <span aria-hidden className="text-line">
                      ·
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="text-trust">
                      ✓
                    </span>
                    {t}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <MostAsked items={MOST_ASKED} />
        </div>
      </section>

      {/* ── Row 3: Featured answer (full width) ── */}
      {featured ? (
        <section className="mt-6">
          <Link
            href={`/answers/${featured.slug}`}
            className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-sm sm:p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
              Featured answer
            </span>
            <h2 className="mt-1.5 font-display text-xl font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink sm:text-2xl">
              {featured.question || featured.title}
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(featured.highlights || []).slice(0, 2).map((h, i) => (
                <Badge key={i} tone="muted">
                  {h}
                </Badge>
              ))}
              {featured.dateModified || featured.datePublished ? (
                <Badge tone="muted">
                  Updated {fmtDate(featured.dateModified || featured.datePublished)}
                </Badge>
              ) : null}
              {(featured.sources?.length ?? 0) > 0 ? (
                <Badge tone="trust">Sources</Badge>
              ) : null}
            </div>
            {featured.summary ? (
              <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                {featured.summary}
              </p>
            ) : null}
            <span className="mt-3 inline-flex w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
              Read answer →
            </span>
          </Link>
        </section>
      ) : null}

      {/* ── Row 4: Categories (compact 4×2) ── */}
      <section id="categories" className="mt-6 scroll-mt-20">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Browse Korea by category
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              href={activeCats.has(c.slug) ? `/${c.slug}` : `/search?q=${encodeURIComponent(c.q)}`}
              className="group flex items-center gap-3 rounded-xl border border-line p-3 transition-shadow hover:shadow-sm"
              style={{ backgroundColor: c.tint }}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted">
                <CategoryIcon kind={c.kind} className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold tracking-tight text-ink">
                  {c.label}
                </span>
                <span className="block truncate text-xs text-ink-muted">
                  {c.blurb}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Row 5: Product teaser + For Brands (slim 2열) ── */}
      <section id="for-brands" className="mt-6 grid scroll-mt-20 gap-4 lg:grid-cols-2">
        {/* Product guides teaser (light) */}
        <div className="flex flex-col rounded-2xl border border-line bg-section p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            Korean product guides
          </p>
          <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight">
            What to actually buy in Korea.
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Honest, sourced guides — K-beauty, fashion, snacks, gifts — built from
            your questions.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {["K-Beauty", "Fashion", "Snacks", "Gifts"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-muted"
              >
                {t}
              </span>
            ))}
          </div>
          <Link
            href="/search?q=what+to+buy+in+Korea"
            className="mt-3 inline-flex w-fit rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white"
          >
            Ask what to buy →
          </Link>
        </div>

        {/* 합친 CTA: 질문 + 브랜드 등록 (둘 다 인스타 DM) */}
        <div className="flex flex-col rounded-2xl bg-ink p-5 text-bg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Ask · or list your brand
          </p>
          <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight text-bg">
            Ask Korea — or get your brand discovered.
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-bg/70">
            Got a question, or a Korean brand to put in front of foreigners? Just
            DM me.
          </p>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="mt-auto inline-flex w-fit pt-3"
          >
            <span className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Message on Instagram
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
