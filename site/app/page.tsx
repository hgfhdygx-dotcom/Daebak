import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, getHomeCategories } from "@/lib/posts";
import type { Post } from "@/lib/posts";
import CategoryCard from "@/components/CategoryCard";
import PopularGuides from "@/components/PopularGuides";
import ExploreByPlace from "@/components/ExploreByPlace";
import ExploreByNeed from "@/components/ExploreByNeed";
import SectionBand from "@/components/SectionBand";
import SmartThumbnail from "@/components/SmartThumbnail";
import ClusterIcon from "@/components/ClusterIcon";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

const INTRO =
  "Clear answers for your first Korea trip — airport routes, subway tips, prices, local guides, " +
  "and trusted sources, from a local Korean perspective.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Daebak — Korea travel, made simple",
  description: INTRO,
  openGraph: { title: "Daebak — Korea travel, made simple", description: INTRO, type: "website" },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Daebak — Korea travel guide",
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
  "Seoul subway with T-money",
  "Where to stay in Seoul",
  "What to buy in Korea",
];
const TRUST = ["Local perspective", "Updated guides", "Cited sources"];

// 히어로 우측 여행 비주얼(레지스트리 seoul-skyline → 사진 있으면 사진, 없으면 폴백 일러스트). 데이터 기반.
const HERO_VISUAL = {
  slug: "", title: "Seoul skyline and travel", body: "",
  bigCategory: "Travel", bigCategorySlug: "travel", imageKey: "seoul-skyline",
} as Post;

export default function Home() {
  const posts = getAllPosts();
  const popular = posts.slice(0, 4);
  const homeCats = getHomeCategories();

  return (
    <>
      <JsonLd data={websiteLd} />

      {/* ── Hero (sky → white gradient) : 검색 우선 + 우측 여행 비주얼 ── */}
      <SectionBand variant="gradient" className="relative overflow-hidden pt-6 pb-10 sm:pt-9 sm:pb-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "16px 16px", color: "var(--color-accent)" }}
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">
              Daebak · plan your Korea trip
            </p>
            <h1 className="mt-2 max-w-xl font-display text-[clamp(2.1rem,4.5vw,3rem)] font-bold leading-[1.06] tracking-tight">
              Korea, made simple.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
              Clear answers for your first Korea trip — airport routes, subway tips, prices, local
              guides, and trusted sources.
            </p>

            <form action="/search" role="search" className="mt-5 max-w-xl">
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card focus-within:border-accent">
                <span aria-hidden className="text-base text-ink-muted">🔍</span>
                <input
                  name="q"
                  type="search"
                  placeholder="Ask about Korea travel, food, shopping, or local places…"
                  aria-label="Ask about Korea"
                  className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
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
                  {i > 0 ? <span aria-hidden className="text-line">·</span> : null}
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="text-accent-ink">✓</span>
                    {t}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* 우측 여행 비주얼 카드 + 설명 오버레이 — 모바일은 숨겨 검색 우선, 데스크탑만 표시 */}
          <div className="group relative hidden lg:block">
            <SmartThumbnail
              post={HERO_VISUAL}
              aspect="4/3"
              priority
              className="rounded-3xl border border-line shadow-card"
            />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center gap-1.5 rounded-xl bg-surface/85 px-3 py-2 text-[0.72rem] font-medium text-ink-muted backdrop-blur">
              <ClusterIcon kind="plane" className="h-3.5 w-3.5 text-accent-ink" />
              Airport → Seoul → neighborhoods → stay
            </div>
          </div>
        </div>
      </SectionBand>

      {/* ── First things travelers ask (white) ── */}
      <SectionBand variant="white" className="py-10">
        <PopularGuides posts={popular} />
      </SectionBand>

      {/* ── Browse Korea travel topics (sky) ── */}
      <SectionBand variant="sky" className="py-10" id="categories">
        <div className="scroll-mt-20">
          <h2 className="font-display text-lg font-bold tracking-tight">Browse Korea travel topics</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {homeCats.map((c) => (
              <CategoryCard key={c.slug} cat={c} />
            ))}
          </div>
        </div>
      </SectionBand>

      {/* ── Explore Korea by neighborhood (white) ── */}
      <SectionBand variant="white" className="py-10">
        <ExploreByPlace />
      </SectionBand>

      {/* ── Plan by what you need (sky) ── */}
      <SectionBand variant="sky" className="py-10">
        <ExploreByNeed />
      </SectionBand>

      {/* ── Product teaser + For Brands (white, 하단) ── */}
      <SectionBand variant="white" className="py-10" id="for-brands">
        <div className="grid scroll-mt-20 gap-4 lg:grid-cols-2">
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
              <span className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                Message on Instagram
              </span>
            </a>
          </div>
        </div>
      </SectionBand>
    </>
  );
}
