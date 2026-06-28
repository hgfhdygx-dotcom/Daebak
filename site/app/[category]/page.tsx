import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import CategoryHero from "@/components/CategoryHero";
import ClusterCard from "@/components/ClusterCard";
import ComingSoonCluster from "@/components/ComingSoonCluster";
import FeaturedAnswer from "@/components/FeaturedAnswer";
import QuickTopicChips from "@/components/QuickTopicChips";
import JsonLd from "@/components/JsonLd";
import {
  categoryStats,
  clusterCounts,
  getActiveCategorySlugs,
  getCategory,
  getClustersOf,
  getFeaturedGuide,
  getNavTopics,
  resolveTopicHref,
  categoryTone,
} from "@/lib/posts";
import { CATEGORY_ICON_FALLBACK } from "@/lib/presentation";
import { buildBreadcrumbLd } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getActiveCategorySlugs().map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return {};
  const url = `${SITE_URL}/${cat.slug}`;
  return {
    title: `${cat.title} in Korea — guides`,
    description: cat.heroSubtitle || cat.description,
    alternates: { canonical: url },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();
  const url = `${SITE_URL}/${cat.slug}`;

  const clusters = getClustersOf(cat.slug);
  const liveClusters = clusters.filter((cl) => clusterCounts(cl.slug).publishedCount > 0);
  const soonClusters = clusters.filter((cl) => clusterCounts(cl.slug).publishedCount === 0);
  const stats = categoryStats(cat.slug);
  const topics = getNavTopics(cat).map((t) => ({ label: t.label, href: resolveTopicHref(t) }));
  const featured = getFeaturedGuide(cat.slug);
  const tint = categoryTone(cat.slug);
  const icon = cat.icon || CATEGORY_ICON_FALLBACK[cat.slug] || "products";

  return (
    <div className="mx-auto max-w-[1760px] px-5 py-7 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd
        data={buildBreadcrumbLd([
          { name: "Home", url: SITE_URL },
          { name: cat.title, url },
        ])}
      />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: cat.title }]} />

      <CategoryHero
        label={cat.label || `${cat.title.toUpperCase()} GUIDE`}
        title={cat.heroTitle || cat.title}
        subtitle={cat.heroSubtitle || cat.description}
        stats={stats}
        icon={icon}
        tint={tint}
        visualKey={cat.visualKey}
        categorySlug={cat.slug}
      />

      <QuickTopicChips topics={topics} />

      {/* 대표 답변 — 2단(좌 QA / 우 추상 패널) */}
      {featured ? (
        <section className="mt-7">
          <FeaturedAnswer post={featured} />
        </section>
      ) : null}

      {/* 라이브 토픽 — 풀 카드(가로형). 1개여도 전폭이라 외톨이/빈 공간 없음 */}
      {liveClusters.length ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight">Topics in {cat.title}</h2>
          <div className="mt-3 grid gap-4">
            {liveClusters.map((cl) => (
              <ClusterCard
                key={cl.id}
                cluster={cl}
                categorySlug={cat.slug}
                counts={clusterCounts(cl.slug)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Coming soon — 컴팩트 pill(풀 카드 강등 → 미완성 느낌 제거) */}
      {soonClusters.length ? (
        <section className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Coming soon
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {soonClusters.map((cl) => (
              <ComingSoonCluster key={cl.id} cluster={cl} categorySlug={cat.slug} />
            ))}
          </div>
        </section>
      ) : null}

      {!clusters.length ? (
        <p className="mt-8 rounded-2xl border border-line bg-section p-6 text-ink-muted">
          More {cat.title} guides are coming soon.
        </p>
      ) : null}
    </div>
  );
}
