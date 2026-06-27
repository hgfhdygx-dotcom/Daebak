import type { MetadataRoute } from "next";
import {
  getActiveCategorySlugs,
  getAllPosts,
  getCategory,
  getClustersOf,
} from "@/lib/posts";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().map((p) => ({
    url: `${SITE_URL}/answers/${p.slug}`,
    lastModified: p.dateModified || p.datePublished || undefined,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // 허브: /<category> + /<category>/<cluster> (콘텐츠 있는 카테고리만)
  const hubs: MetadataRoute.Sitemap = [];
  for (const catSlug of getActiveCategorySlugs()) {
    const cat = getCategory(catSlug);
    if (!cat) continue;
    hubs.push({ url: `${SITE_URL}/${cat.slug}`, changeFrequency: "weekly", priority: 0.6 });
    for (const cl of getClustersOf(cat.slug)) {
      hubs.push({
        url: `${SITE_URL}/${cat.slug}/${cl.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...hubs,
    ...posts,
  ];
}
