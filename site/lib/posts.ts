// content/answers/*.mdx 를 읽어 frontmatter + 본문을 제공. (서버 전용 — fs 사용)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Source = { url: string; domain?: string };
export type Faq = { q: string; a: string };
export type CitationPack = { answer?: string; keyFacts?: string[]; quotable?: string };

export type PostMeta = {
  title: string;
  slug: string;
  question?: string;
  summary?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  lastUpdatedLabel?: string;
  sources?: Source[];
  faq?: Faq[];
  citationPack?: CitationPack;
  verifyFlags?: string[];
};

export type Post = PostMeta & { body: string };

const ANSWERS_DIR = path.join(process.cwd(), "content", "answers");

function readDir(): string[] {
  try {
    return fs.readdirSync(ANSWERS_DIR).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  } catch {
    return [];
  }
}

export function getAllPosts(): Post[] {
  const posts = readDir()
    .map((file) => getPostBySlug(file.replace(/\.mdx?$/, "")))
    .filter((p): p is Post => Boolean(p));
  // 최신 발행순
  posts.sort((a, b) => (b.datePublished || "").localeCompare(a.datePublished || ""));
  return posts;
}

export function getAllSlugs(): string[] {
  return readDir().map((f) => f.replace(/\.mdx?$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
  for (const ext of [".mdx", ".md"]) {
    const full = path.join(ANSWERS_DIR, `${slug}${ext}`);
    if (fs.existsSync(full)) {
      const raw = fs.readFileSync(full, "utf8");
      const { data, content } = matter(raw);
      return {
        ...(data as PostMeta),
        slug: (data as PostMeta).slug || slug,
        title: (data as PostMeta).title || slug,
        body: content.trim(),
      };
    }
  }
  return null;
}

// 관련 답변: 최근 발행된 다른 글(현재 글 제외). 추후 카테고리/키워드 기반으로 교체 가능.
export function getRelatedPosts(slug: string, limit = 5): Post[] {
  return getAllPosts()
    .filter((p) => p.slug !== slug)
    .slice(0, limit);
}
