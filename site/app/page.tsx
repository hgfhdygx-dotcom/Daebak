import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, getHomeCategories } from "@/lib/posts";
import type { Post } from "@/lib/posts";
import CategoryCard from "@/components/CategoryCard";
import PopularGuides from "@/components/PopularGuides";
import AskDaebak, { ASK_EXAMPLES } from "@/components/AskDaebak";
import SectionBand from "@/components/SectionBand";
import SmartThumbnail from "@/components/SmartThumbnail";
import Attribution from "@/components/Attribution";
import LineIcon from "@/components/LineIcon";
import JsonLd from "@/components/JsonLd";
import { getApprovedVisual } from "@/lib/visuals";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

const INTRO =
  "Know what to buy, where to buy it, and how to use Korean products, shops, apps, and travel " +
  "essentials — clear, sourced answers for foreigners in Korea.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Daebak — what to buy & how to get around Korea",
  description: INTRO,
  openGraph: { title: "Daebak — what to buy & how to get around Korea", description: INTRO, type: "website" },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Daebak — Korea shopping & travel essentials guide",
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

// 히어로 우측 여행 비주얼 — admin Image Manager 의 'hero:home' 승인 사진(있으면 hotlink, 없으면 흰 패널 폴백).
const HERO_VISUAL = {
  slug: "", title: "Seoul skyline and travel", body: "",
  bigCategory: "Travel", bigCategorySlug: "travel",
} as Post;

export default function Home() {
  const posts = getAllPosts();
  const popular = posts.slice(0, 4);
  const homeCats = getHomeCategories(); // 모든 bigCategory 카드화(MORE 제거). 이미지 미지정이면 fallback.
  const heroVisual = getApprovedVisual("hero", "home"); // 승인된 Unsplash 히어로 사진(있으면 hotlink)

  return (
    <>
      <JsonLd data={websiteLd} />

      {/* ── Hero : 4단(헤드라인·부제·검색·예시+신뢰) + 큰 우측 비주얼 ── */}
      <SectionBand variant="gradient" className="relative overflow-hidden pt-5 pb-6 sm:pt-7 sm:pb-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "18px 18px", color: "var(--color-accent)" }}
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* LEFT */}
          <div className="max-w-xl">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-accent-ink">
              For foreigners in Korea
            </p>
            <h1 className="mt-2.5 font-display text-[clamp(2.4rem,5vw,3.6rem)] font-bold leading-[1.03] tracking-tight text-ink">
              Korea, made simple.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
              Know what to buy, where to buy it, and how to use Korean products, shops, apps, and
              travel essentials — sourced answers, from a Korean local.
            </p>

            {/* 홈 히어로 입력 = 질문칸(Ask Daebak). 검색은 헤더 우측에 있음. 예시 칩은 질문칸 prefill. */}
            <AskDaebak className="mt-6" sourceComponent="home_search" examples={ASK_EXAMPLES} showDescription={false} />

            <p className="mt-3 hidden items-center gap-1.5 text-xs font-medium text-ink-soft sm:flex">
              <LineIcon name="check" className="h-3.5 w-3.5 text-trust" strokeWidth={2.25} />
              Local · sourced · updated
            </p>
          </div>

          {/* RIGHT — 큰 비주얼(좌우 빈 공간 제거). 모바일은 숨겨 검색 우선. */}
          <div className="group relative hidden lg:block">
            <div className="relative overflow-hidden rounded-[28px] border border-line shadow-card-hover">
              <SmartThumbnail post={HERO_VISUAL} visual={heroVisual} aspect="16/9" level="bigCategory" priority className="max-h-[340px]" />
              {heroVisual ? <Attribution visual={heroVisual} className="absolute inset-x-0 bottom-0 z-10" /> : null}
            </div>
          </div>
        </div>
      </SectionBand>

      {/* ── Browse by category (사진 카드 먼저 = 이미지 조기 노출) ── */}
      <SectionBand variant="white" className="py-6" id="categories">
        <div className="scroll-mt-20">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Browse Korea by category
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">Pick a topic — what to buy, where to go, and how to use it.</p>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {homeCats.map((c) => (
              <CategoryCard key={c.slug} cat={c} />
            ))}
          </div>
        </div>
      </SectionBand>

      {/* ── First things travelers ask (Q&A) ── */}
      <SectionBand variant="sky" className="py-6">
        <PopularGuides posts={popular} />
      </SectionBand>

      {/* ── Product teaser + For Brands ── */}
      <SectionBand variant="white" className="py-8" id="for-brands">
        <div className="grid scroll-mt-20 gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-line bg-section p-6">
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
              className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white"
            >
              Ask what to buy
              <LineIcon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-line bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
              Ask · or list your brand
            </p>
            <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight">
              A question, or a Korean brand to share?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Got a question, or a Korean brand to put in front of foreigners? Just DM me.
            </p>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-auto inline-flex w-fit pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                Message on Instagram
                <LineIcon name="arrow-up-right" className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>
      </SectionBand>
    </>
  );
}
