import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AnswerCard from "@/components/AnswerCard";
import Breadcrumb from "@/components/Breadcrumb";
import CategoryHero from "@/components/CategoryHero";
import ClusterCard from "@/components/ClusterCard";
import QuickTopicChips from "@/components/QuickTopicChips";
import JsonLd from "@/components/JsonLd";
import {
  categoryStats,
  clusterCounts,
  clusterFeaturedQuestion,
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
    <div className="mx-auto max-w-[1280px] px-5 py-7 sm:px-6 sm:py-10 lg:px-8">
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

      {/* 대표 라이브 가이드(자동 선택) */}
      {featured ? (
        <section className="mt-6">
          <AnswerCard post={featured} variant="featured" />
        </section>
      ) : null}

      {/* 가이드 컬렉션 카드 — 라이브 우선 */}
      {liveClusters.length ? (
        <section className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveClusters.map((cl) => (
              <ClusterCard
                key={cl.id}
                cluster={cl}
                categorySlug={cat.slug}
                counts={clusterCounts(cl.slug)}
                featuredQuestion={clusterFeaturedQuestion(cl.slug)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Coming soon 클러스터 — 아래로 */}
      {soonClusters.length ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Coming soon
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {soonClusters.map((cl) => (
              <ClusterCard key={cl.id} cluster={cl} categorySlug={cat.slug} counts={clusterCounts(cl.slug)} />
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
