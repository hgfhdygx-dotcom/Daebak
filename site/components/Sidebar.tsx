import Link from "next/link";
import SmartThumbnail from "@/components/SmartThumbnail";
import Attribution from "@/components/Attribution";
import { getCluster } from "@/lib/posts";
import { getApprovedVisual } from "@/lib/visuals";
import type { ParsedTable } from "@/lib/markdownTable";
import type { Post } from "@/lib/posts";

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

// 문의 CTA — 사이드바(데스크톱)와 본문 하단(모바일) 양쪽에서 재사용.
export function AskCta() {
  return (
    <div className="rounded-2xl border border-accent/30 bg-surface p-5">
      <p className="font-display text-base font-semibold text-ink">Ask anything about Korea</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Travel, food, transport — ask and I&apos;ll find the real answer, from a local Korean.
      </p>
      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Ask on Instagram
      </a>
    </div>
  );
}

// 데스크톱 우측 사이드바: compact contextual visual(작게) · 빠른 선택 · 최신글 · 문의 CTA.
// 사이드바 자체가 Article 에서 lg+ 에서만 렌더 → 모바일에서는 이미지 안 보임(답변 우선).
export default function Sidebar({
  post,
  table,
  related,
}: {
  post: Post;
  table: ParsedTable | null;
  related: Post[];
}) {
  const cluster = post.clusterSlug ? getCluster(post.clusterSlug) : null;
  // 클러스터 의미 기반 contextual visual(사진 있으면 사진, 없으면 흰 패널 fallback). imageKey=클러스터 visualKey.
  const visual = {
    title: cluster?.title || post.cluster || post.bigCategory || "Korea travel",
    cluster: cluster?.title || post.cluster,
    bigCategory: post.bigCategory,
    bigCategorySlug: post.bigCategorySlug,
    clusterSlug: post.clusterSlug,
  } as Post;
  const visualIcon = cluster?.icon || "travel";
  const approved = getApprovedVisual("cluster", post.clusterSlug); // 승인된 Unsplash 사진(있으면 hotlink)

  let picks: { when: string; pick: string }[] = [];
  if (table) {
    const bi = table.headers.findIndex((h) => /best/i.test(h));
    if (bi >= 0) {
      picks = table.rows
        .map((r) => ({ when: r[bi], pick: r[0] }))
        .filter((p) => p.when && p.pick)
        .slice(0, 4);
    }
  }

  return (
    <div className="space-y-6">
      {/* compact contextual visual — 작고 보조적(답변을 밀어내지 않음) */}
      <div className="overflow-hidden rounded-2xl border border-line shadow-card">
        <div className="relative">
          <SmartThumbnail post={visual} visual={approved} aspect="4/3" level="cluster" iconKind={visualIcon} />
          {approved ? <Attribution visual={approved} className="absolute bottom-1.5 right-1.5 z-10" /> : null}
        </div>
        {cluster ? (
          <p className="px-4 py-2.5 text-[0.72rem] font-medium text-ink-muted">
            From <span className="text-accent-ink">{cluster.title}</span>
          </p>
        ) : null}
      </div>

      {picks.length > 0 ? (
        <div className="rounded-2xl border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Quick pick</p>
          <ul className="mt-3 space-y-3 text-sm">
            {picks.map((p, i) => (
              <li key={i} className="leading-snug">
                <span className="text-ink-muted">{p.when}</span>
                <span className="mt-0.5 block font-medium text-accent-ink">→ {p.pick}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {related.length > 0 ? (
        <div className="rounded-2xl border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Recent answers
          </p>
          <ul className="mt-3 space-y-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/answers/${p.slug}`}
                  className="text-sm font-medium leading-snug text-ink transition-colors hover:text-accent-ink"
                >
                  {p.question || p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AskCta />
    </div>
  );
}
