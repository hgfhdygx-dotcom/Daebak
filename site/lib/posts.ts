// content/answers/*.mdx + content/taxonomy.json 를 읽어 frontmatter·본문·택소노미를 제공. (서버 전용 — fs)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORY_ICON_FALLBACK, CATEGORY_TINT } from "@/lib/presentation";

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
  priority?: number;
  featured?: boolean;
  tags?: string[];
  // worth_it 상세 템플릿용 선택 필드(없으면 숨김)
  verdict?: string;
  goodFor?: string[];
  notFor?: string[];
  alternatives?: string[];
  // 의도별 상세 템플릿용 선택 필드(없으면 숨김 — 재생성 시 채워짐)
  priceFactors?: string[];   // PriceFirst: 가격 변동 요인
  steps?: string[];          // Steps: 단계
  topPick?: string;          // Recommendation: 대표 추천
  criteria?: string[];       // Recommendation: 추천 기준
  buyLocations?: string[];   // Buying: 구매처
  productGroups?: string[];  // Buying: 상품군
};

export type Post = PostMeta & { body: string };

// ── 택소노미 타입 ────────────────────────────────────────────────────
export type ClusterQ = { question: string; slug: string };
export type NavTopic = { label: string; href?: string; clusterSlug?: string; q?: string; icon?: string };
export type Cluster = {
  id: string;
  title: string;
  slug: string;
  bigCategory: string;
  description?: string;
  icon?: string;
  featured?: boolean;
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
  label?: string;
  icon?: string;
  blurb?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  navTopics?: NavTopic[];
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

// ── 네비게이션 / 홈 / 카테고리 데이터 헬퍼 ───────────────────────────────
export function isActiveCategory(slug: string): boolean {
  return getActiveCategorySlugs().includes(slug);
}

// 활성 카테고리만 /[slug] 로, 그 외(빈 카테고리)는 /search 로 — 404 방지.
export function categoryHref(cat: BigCategory): string {
  return isActiveCategory(cat.slug) ? `/${cat.slug}` : `/search?q=${encodeURIComponent(cat.title)}`;
}

// ★ 모든 메뉴/칩/pill 링크는 이 resolver 를 통과해야 한다(404 방지):
//   명시 href → 존재하는 cluster면 /[cat]/[cluster] → q면 /search?q= → label로 /search?q=
export function resolveTopicHref(t: NavTopic): string {
  if (t.href) return t.href;
  if (t.clusterSlug) {
    const cl = getCluster(t.clusterSlug);
    if (cl) {
      const cat = getCategory(cl.bigCategory);
      return `/${cat?.slug || cl.bigCategory}/${cl.slug}`;
    }
  }
  return `/search?q=${encodeURIComponent(t.q || t.label || "")}`;
}

// 카테고리의 nav 토픽: navTopics 있으면 사용, 없으면 clusters 에서 파생.
export function getNavTopics(cat: BigCategory): NavTopic[] {
  if (cat.navTopics && cat.navTopics.length) return cat.navTopics;
  return getClustersOf(cat.slug).map((cl) => ({ label: cl.title, clusterSlug: cl.slug, icon: cl.icon }));
}

export type MenuCategory = {
  slug: string;
  title: string;
  icon: string;
  href: string;
  topics: { label: string; href: string; icon?: string }[];
};
// 메가메뉴/모바일 accordion 데이터(모든 bigCategory). 링크는 전부 resolver 통과.
export function getCategoryNav(): MenuCategory[] {
  return getTaxonomy().bigCategories.map((cat) => ({
    slug: cat.slug,
    title: cat.title,
    icon: cat.icon || CATEGORY_ICON_FALLBACK[cat.slug] || "products",
    href: categoryHref(cat),
    topics: getNavTopics(cat)
      .slice(0, 6)
      .map((t) => ({ label: t.label, href: resolveTopicHref(t), icon: t.icon })),
  }));
}

export function categoryStats(catSlug: string): { live: number; soon: number; topics: number } {
  const clusters = getClustersOf(catSlug);
  let live = 0;
  let soon = 0;
  for (const cl of clusters) {
    const c = clusterCounts(cl.slug);
    live += c.publishedCount;
    soon += c.draftCount;
  }
  const cat = getCategory(catSlug);
  return { live, soon, topics: cat ? getNavTopics(cat).length : clusters.length };
}

// 카테고리 대표 발행 가이드 자동 선택: featured flag → priority → pillar → 최신. (제목 하드코딩 X)
export function getFeaturedGuide(catSlug: string): Post | null {
  const posts = getPostsByCategory(catSlug);
  if (!posts.length) return null;
  const score = (p: Post) =>
    (p.featured ? 1_000_000 : 0) + (typeof p.priority === "number" ? p.priority * 1000 : 0);
  const sorted = [...posts].sort((a, b) => {
    const s = score(b) - score(a);
    return s || (b.datePublished || "").localeCompare(a.datePublished || "");
  });
  const top = sorted[0];
  if (!top.featured && top.priority == null) {
    const pillar = sorted.find((p) => p.questionType === "pillar");
    if (pillar) return pillar;
  }
  return top;
}

// 사이트 전체 대표 발행 가이드(홈 Featured) — 활성 카테고리들의 발행글 중 featured→priority→pillar→최신.
// (이전엔 홈이 최신글 posts[0] 를 썼다 — priority/featured 무시 버그. 이제 대표글을 자동 선택.)
export function getSiteFeatured(): Post | null {
  const posts = getAllPosts();
  if (!posts.length) return null;
  const score = (p: Post) =>
    (p.featured ? 1_000_000 : 0) +
    (typeof p.priority === "number" ? p.priority * 1000 : 0) +
    (p.questionType === "pillar" ? 100 : 0);
  return [...posts].sort(
    (a, b) => score(b) - score(a) || (b.datePublished || "").localeCompare(a.datePublished || ""),
  )[0];
}

// 클러스터의 대표 "발행" 질문(R1) — live 카드가 실제 발행 질문을 보여주도록. 발행글 없으면 taxonomy pillar 질문 폴백.
export function clusterFeaturedQuestion(clusterSlug: string): string {
  const published = getPostsByCluster(clusterSlug);
  if (published.length) {
    const score = (p: Post) =>
      (p.featured ? 1_000_000 : 0) +
      (typeof p.priority === "number" ? p.priority * 1000 : 0) +
      (p.questionType === "pillar" ? 100 : 0);
    const top = [...published].sort(
      (a, b) => score(b) - score(a) || (b.datePublished || "").localeCompare(a.datePublished || ""),
    )[0];
    return top.question || top.title || "";
  }
  return getCluster(clusterSlug)?.pillarQuestions?.[0]?.question || "";
}

export type HomeCategory = {
  slug: string;
  title: string;
  blurb: string;
  icon: string;
  tint: string;
  href: string;
  active: boolean;
  pills: { label: string; href: string }[];
};
// 홈 "Browse by category" 단일 소스(taxonomy + presentation 파생). page.tsx CATEGORIES const 대체.
export function getHomeCategories(): HomeCategory[] {
  return getTaxonomy().bigCategories.map((cat) => ({
    slug: cat.slug,
    title: cat.title,
    blurb: cat.blurb || cat.description || "",
    icon: cat.icon || CATEGORY_ICON_FALLBACK[cat.slug] || "products",
    tint: CATEGORY_TINT[cat.slug] || "#faf6f0",
    href: categoryHref(cat),
    active: isActiveCategory(cat.slug),
    pills: getNavTopics(cat)
      .slice(0, 5)
      .map((t) => ({ label: t.label, href: resolveTopicHref(t) })),
  }));
}
