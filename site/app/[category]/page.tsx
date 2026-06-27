import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import ClusterCard from "@/components/ClusterCard";
import JsonLd from "@/components/JsonLd";
import {
  clusterCounts,
  getActiveCategorySlugs,
  getCategory,
  getClustersOf,
} from "@/lib/posts";
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
    description: cat.description,
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
  const clusters = getClustersOf(cat.slug);
  const url = `${SITE_URL}/${cat.slug}`;

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-9 sm:px-6 sm:py-12 lg:px-8">
      <JsonLd
        data={buildBreadcrumbLd([
          { name: "Home", url: SITE_URL },
          { name: cat.title, url },
        ])}
      />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: cat.title }]} />
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.12] tracking-tight">
        {cat.title}
      </h1>
      {cat.description ? (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
          {cat.description}
        </p>
      ) : null}

      {clusters.length ? (
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cl) => (
            <ClusterCard
              key={cl.id}
              cluster={cl}
              categorySlug={cat.slug}
              counts={clusterCounts(cl.slug)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-7 rounded-2xl border border-line bg-section p-6 text-ink-muted">
          More {cat.title} guides are coming soon.
        </p>
      )}
    </div>
  );
}
