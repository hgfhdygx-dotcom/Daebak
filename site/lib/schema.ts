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
