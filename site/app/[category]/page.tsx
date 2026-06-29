import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const orderedClusters = [...liveClusters, ...soonClusters]; // 라이브 먼저, 한 그리드로 균형
  const stats = categoryStats(cat.slug);
  const topics = getNavTopics(cat).map((t) => ({ label: t.label, href: resolveTopicHref(t) }));
  const tint = categoryTone(cat.slug);
  const icon = cat.icon || CATEGORY_ICON_FALLBACK[cat.slug] || "products";

  return (
    <div className="mx-auto max-w-[1760px] px-5 py-6 sm:px-6 sm:py-8 lg:px-8">
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

      {/* 클러스터 그리드 — 모든 토픽(라이브 먼저) 2~3열 균형. 라이브 1개여도 그리드가 차서 외톨이 없음 */}
      {orderedClusters.length ? (
        <section className="mt-7">
          <h2 className="font-display text-lg font-bold tracking-tight">Topics in {cat.title}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedClusters.map((cl) => {
              const counts = clusterCounts(cl.slug);
              const fq =
                counts.publishedCount > 0
                  ? clusterFeaturedQuestion(cl.slug)
                  : cl.pillarQuestions?.[0]?.question;
              return (
                <ClusterCard
                  key={cl.id}
                  cluster={cl}
                  categorySlug={cat.slug}
                  counts={counts}
                  featuredQuestion={fq}
                />
              );
            })}
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
