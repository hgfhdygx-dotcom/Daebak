import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Article from "@/components/Article";
import JsonLd from "@/components/JsonLd";
import { getAllSlugs, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { buildArticleLd, buildBreadcrumbLd, buildFaqLd } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `${SITE_URL}/answers/${post.slug}`;
  // 검증 안 된 사실([VERIFY])이 남아 있으면 색인 제외 — 확인 후 풀림.
  const hasVerify = (post.verifyFlags?.length ?? 0) > 0;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    robots: hasVerify ? { index: false, follow: true } : undefined,
    openGraph: { title: post.title, description: post.summary, url, type: "article" },
  };
}

export default async function AnswerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug);
  const url = `${SITE_URL}/answers/${post.slug}`;

  // 브레드크럼: Home / Category / Cluster / (현재). 택소노미 필드 있을 때만 단계 추가.
  const crumbs: { name: string; href?: string }[] = [{ name: "Home", href: "/" }];
  const ldCrumbs: { name: string; url: string }[] = [{ name: "Home", url: SITE_URL }];
  if (post.bigCategorySlug) {
    crumbs.push({ name: post.bigCategory || post.bigCategorySlug, href: `/${post.bigCategorySlug}` });
    ldCrumbs.push({ name: post.bigCategory || post.bigCategorySlug, url: `${SITE_URL}/${post.bigCategorySlug}` });
    if (post.clusterSlug) {
      crumbs.push({
        name: post.cluster || post.clusterSlug,
        href: `/${post.bigCategorySlug}/${post.clusterSlug}`,
      });
      ldCrumbs.push({
        name: post.cluster || post.clusterSlug,
        url: `${SITE_URL}/${post.bigCategorySlug}/${post.clusterSlug}`,
      });
    }
  }
  crumbs.push({ name: post.question || post.title });
  ldCrumbs.push({ name: post.question || post.title, url });

  return (
    <>
      <JsonLd data={buildArticleLd(post, url)} />
      {ldCrumbs.length > 1 ? <JsonLd data={buildBreadcrumbLd(ldCrumbs)} /> : null}
      {post.faq && post.faq.length > 0 ? (
        <JsonLd data={buildFaqLd(post)} />
      ) : null}
      <Article post={post} related={related} crumbs={crumbs} />
    </>
  );
}
