import type { Post } from "@/lib/posts";
import { AUTHOR_NAME, SITE_NAME } from "@/lib/site";

// ⚠️ GEO 메모: JSON-LD는 인용 상승 효과가 약하다고 검증됨(기법 F) → 엔티티 정합성 보조용.
// 인용 무게는 보이는 본문(answer-first·Citation Pack·FAQ)이 진다.

export function buildArticleLd(post: Post, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary || post.citationPack?.answer || "",
    inLanguage: "en",
    datePublished: post.datePublished,
    dateModified: post.dateModified || post.datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: post.author || AUTHOR_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

// Breadcrumb: Home → Category → Cluster → Article. (구조 명료성 보조 — 인용 레버는 본문.)
export function buildBreadcrumbLd(
  crumbs: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function buildFaqLd(post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (post.faq ?? []).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// Entity(브랜드/스토어/앱/제품) 페이지용 — Product. offers 는 monetization.buyLinks 있을 때만.
export function buildProductLd(post: Post, url: string) {
  const offers = (post.monetization?.buyLinks ?? []).map((l) => ({
    "@type": "Offer",
    url: l.url,
    ...(l.store ? { seller: { "@type": "Organization", name: l.store } } : {}),
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: post.title,
    description: post.summary || post.citationPack?.answer || "",
    ...(offers.length ? { offers } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

// Buying-guide 페이지용 — ItemList(추천 목록). productGroups/criteria 에서 항목 추출.
export function buildItemListLd(post: Post, url: string) {
  const list = post.productGroups || post.criteria || [];
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: post.title,
    url,
    itemListElement: list.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
    })),
  };
}
