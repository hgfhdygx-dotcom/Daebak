import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnswerCard from "@/components/AnswerCard";
import Breadcrumb from "@/components/Breadcrumb";
import SmartThumbnail from "@/components/SmartThumbnail";
import JsonLd from "@/components/JsonLd";
import { distinctCardIcons } from "@/lib/cardIntent";
import {
  categoryTone,
  getCategory,
  getCluster,
  getClustersOf,
  getPillarPost,
  getPostsByCluster,
  getTaxonomy,
  type Post,
} from "@/lib/posts";
import { buildBreadcrumbLd } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const tx = getTaxonomy();
  const params: { category: string; cluster: string }[] = [];
  for (const cl of tx.clusters) {
    const cat = tx.bigCategories.find(
      (c) => c.id === cl.bigCategory || c.slug === cl.bigCategory,
    );
    if (cat) params.push({ category: cat.slug, cluster: cl.slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; cluster: string }>;
}): Promise<Metadata> {
  const { category, cluster } = await params;
  const cl = getCluster(cluster);
  if (!cl) return {};
  const url = `${SITE_URL}/${category}/${cl.slug}`;
  return {
    title: `${cl.title} — Korea travel Q&A`,
    description: cl.description,
    alternates: { canonical: url },
  };
}

export default async function ClusterPage({
  params,
}: {
  params: Promise<{ category: string; cluster: string }>;
}) {
  const { category, cluster } = await params;
  const cat = getCategory(category);
  const cl = getCluster(cluster);
  if (!cat || !cl || (cl.bigCategory !== cat.id && cl.bigCategory !== cat.slug)) notFound();

  const pillar = getPillarPost(cl.slug);
  const published = getPostsByCluster(cl.slug).filter((p) => p.slug !== pillar?.slug);
  const publishedSlugs = new Set(
    [pillar?.slug, ...published.map((p) => p.slug)].filter(Boolean) as string[],
  );
  const comingSoon = [
    ...(cl.pillarQuestions ?? []),
    ...(cl.supportingQuestions ?? []),
  ].filter((q) => q.slug && !publishedSlugs.has(q.slug));
  const relatedClusters = getClustersOf(cat.slug)
    .filter((c) => c.slug !== cl.slug)
    .slice(0, 4);
  const url = `${SITE_URL}/${cat.slug}/${cl.slug}`;
  // 같은 페이지(대표글 + 발행글) 아이콘 중복 회피
  const articleIcons = distinctCardIcons([pillar, ...published].filter(Boolean) as Post[]);
  const pubIconAt = (i: number) => articleIcons[(pillar ? 1 : 0) + i];

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd
        data={buildBreadcrumbLd([
          { name: "Home", url: SITE_URL },
          { name: cat.title, url: `${SITE_URL}/${cat.slug}` },
          { name: cl.title, url },
        ])}
      />
      <Breadcrumb
        items={[
          { name: "Home", href: "/" },
          { name: cat.title, href: `/${cat.slug}` },
          { name: cl.title },
        ]}
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.12] tracking-tight">
            {cl.title}
          </h1>
          {cl.description ? (
            <p className="mt-2 text-base leading-relaxed text-ink-muted">
              {cl.description}
            </p>
          ) : null}
        </div>
        {/* 우측 compact 클러스터 비주얼(사진 or 흰 패널 폴백) — 모바일 숨김 */}
        <div className="hidden shrink-0 sm:block">
          <SmartThumbnail
            post={{
              title: cl.title,
              cluster: cl.title,
              bigCategorySlug: cat.slug,
              clusterSlug: cl.slug,
              imageKey: cl.visualKey,
            } as Post}
            aspect="4/3"
            level="cluster"
            iconKind={cl.icon}
            tint={categoryTone(cl.bigCategory)}
            className="w-40 rounded-2xl border border-line shadow-card lg:w-48"
          />
        </div>
      </div>

      {/* 대표 글(Pillar) — 카드가 스스로 인텐트 라벨(MAIN GUIDE 등) 표시 */}
      {pillar ? (
        <section className="mt-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
            Start here
          </p>
          <AnswerCard post={pillar} variant="featured" icon={articleIcons[0]} />
        </section>
      ) : null}

      {/* 발행된 supporting 답변 */}
      {published.length ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight">Traveler questions</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {published.map((p, i) => (
              <AnswerCard key={p.slug} post={p} icon={pubIconAt(i)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Coming soon — 아직 발행 안 된 기획 질문(질문 그림자 점유) */}
      {comingSoon.length ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight">Coming soon</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {comingSoon.map((q, i) => (
              <li
                key={i}
                className="rounded-xl border border-dashed border-line bg-section px-3.5 py-2.5 text-sm text-ink-muted"
              >
                {q.question}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 관련 클러스터 */}
      {relatedClusters.length ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            More in {cat.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedClusters.map((c) => (
              <Link
                key={c.id}
                href={`/${cat.slug}/${c.slug}`}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent-ink"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
