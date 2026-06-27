// content/answers/*.mdx + content/taxonomy.json 를 읽어 frontmatter·본문·택소노미를 제공. (서버 전용 — fs)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Source = { url: string; domain?: string; note?: string };
export type Faq = { q: string; a: string };
export type CitationPack = { answer?: string; keyFacts?: string[]; quotable?: string };
export type GlanceItem = { label: string; value: string };

export type PostMeta = {
  title: string;
  slug: string;
  question?: string;
  summary?: string;
  answerSummary?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  lastUpdatedLabel?: string;
  sources?: Source[];
  faq?: Faq[];
  citationPack?: CitationPack;
  atAGlance?: GlanceItem[];
  highlights?: string[];
  route?: string[];
  verifyFlags?: string[];
  // 클러스터 CMS (taxonomy) 필드
  bigCategory?: string;
  bigCategorySlug?: string;
  cluster?: string;
  clusterSlug?: string;
  pillarSlug?: string;
  pillarQuestion?: string;
  questionType?: "pillar" | "supporting" | "faq";
  pageType?: string;
  intent?: string;
  needsFreshSource?: boolean;
  relatedGuides?: string[];
  geoScore?: number;
};

export type Post = PostMeta & { body: string };

// ── 택소노미 타입 ────────────────────────────────────────────────────
export type ClusterQ = { question: string; slug: string };
export type Cluster = {
  id: string;
  title: string;
  slug: string;
  bigCategory: string;
  description?: string;
  pillarQuestions?: ClusterQ[];
  supportingQuestions?: ClusterQ[];
  faqQuestions?: ClusterQ[];
  officialSources?: Source[];
  priority?: number;
  status?: string;
  publishQueue?: string[];
};
export type BigCategory = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  clusters: string[];
  status?: string;
};
export type Taxonomy = {
  bigCategories: BigCategory[];
  clusters: Cluster[];
  sensitiveTopics?: string[];
};

const ANSWERS_DIR = path.join(process.cwd(), "content", "answers");
const TAXONOMY_FILE = path.join(process.cwd(), "content", "taxonomy.json");

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

// ── 택소노미 로더 + 헬퍼 (사이트 빌드가 이 파일 하나를 파이썬과 공유) ──
let _taxo: Taxonomy | null = null;
export function getTaxonomy(): Taxonomy {
  if (_taxo) return _taxo;
  try {
    _taxo = JSON.parse(fs.readFileSync(TAXONOMY_FILE, "utf8")) as Taxonomy;
  } catch {
    _taxo = { bigCategories: [], clusters: [] };
  }
  if (!_taxo.bigCategories) _taxo.bigCategories = [];
  if (!_taxo.clusters) _taxo.clusters = [];
  return _taxo;
}

export function getCategory(slug: string): BigCategory | null {
  return getTaxonomy().bigCategories.find((c) => c.slug === slug) || null;
}
export function getCluster(slug: string): Cluster | null {
  return getTaxonomy().clusters.find((c) => c.slug === slug) || null;
}
export function getClustersOf(catSlug: string): Cluster[] {
  const cat = getCategory(catSlug);
  if (!cat) return [];
  const tx = getTaxonomy();
  return cat.clusters
    .map((id) => tx.clusters.find((c) => c.id === id || c.slug === id))
    .filter((c): c is Cluster => Boolean(c));
}
// 콘텐츠가 있는(=발행글이 ≥1) 카테고리만 — 빈 starter 는 허브 생성 안 함(404 회피, 빈 페이지 방지).
export function getActiveCategorySlugs(): string[] {
  const posts = getAllPosts();
  return getTaxonomy()
    .bigCategories.filter(
      (c) =>
        getClustersOf(c.slug).some((cl) => (cl.pillarQuestions?.length ?? 0) > 0) ||
        posts.some((p) => p.bigCategorySlug === c.slug),
    )
    .map((c) => c.slug);
}
export function getAllCategorySlugs(): string[] {
  return getTaxonomy().bigCategories.map((c) => c.slug);
}
export function getAllClusterSlugs(): string[] {
  return getTaxonomy().clusters.map((c) => c.slug);
}
export function getPostsByCategory(catSlug: string): Post[] {
  return getAllPosts().filter((p) => p.bigCategorySlug === catSlug);
}
export function getPostsByCluster(clusterSlug: string): Post[] {
  return getAllPosts().filter((p) => p.clusterSlug === clusterSlug);
}
export function getPillarPost(clusterSlug: string): Post | null {
  const cl = getCluster(clusterSlug);
  const ps = cl?.pillarQuestions?.[0]?.slug;
  return ps ? getPostBySlug(ps) : null;
}

// 클러스터 카운트(실시간 계산 — taxonomy 에 저장하지 않음): 발행수 + 예정수(coming soon).
// 발행수 = (택소노미 planned 슬러그 중 실제 파일 존재) ∪ (clusterSlug 로 태그된 글) — 중복 제거.
export function clusterCounts(clusterSlug: string): {
  publishedCount: number;
  draftCount: number;
} {
  const cl = getCluster(clusterSlug);
  const planned = [...(cl?.pillarQuestions ?? []), ...(cl?.supportingQuestions ?? [])];
  const plannedSlugs = planned.map((q) => q.slug).filter(Boolean) as string[];
  const allSlugs = new Set(getAllSlugs());
  const published = new Set<string>();
  plannedSlugs.forEach((s) => {
    if (allSlugs.has(s)) published.add(s);
  });
  getPostsByCluster(clusterSlug).forEach((p) => published.add(p.slug));
  const draftCount = plannedSlugs.filter((s) => !allSlugs.has(s)).length;
  return { publishedCount: published.size, draftCount };
}

// 관련 답변(§18): 명시 relatedGuides 핀 → 같은 cluster → 같은 bigCategory → 최신. 슬러그→현재 Post resolve(stale 방지).
export function getRelatedPosts(slug: string, limit = 5): Post[] {
  const cur = getPostBySlug(slug);
  const all = getAllPosts();
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const out: Post[] = [];
  const seen = new Set<string>([slug]);
  const add = (s?: string) => {
    if (!s || seen.has(s)) return;
    const p = bySlug.get(s);
    if (p) {
      seen.add(s);
      out.push(p);
    }
  };
  (cur?.relatedGuides ?? []).forEach(add);
  if (cur?.clusterSlug) all.filter((p) => p.clusterSlug === cur.clusterSlug).forEach((p) => add(p.slug));
  if (cur?.bigCategorySlug)
    all.filter((p) => p.bigCategorySlug === cur.bigCategorySlug).forEach((p) => add(p.slug));
  all.forEach((p) => add(p.slug));
  return out.slice(0, limit);
}
