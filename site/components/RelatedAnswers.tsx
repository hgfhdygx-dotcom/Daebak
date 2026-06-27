import Link from "next/link";
import type { Post } from "@/lib/posts";

// 관련 답변 — 하단 카드(토픽 클러스터 GEO 내부링크 겸용). 카테고리 생기면 그 기준으로 교체 가능.
export default function RelatedAnswers({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mt-14 border-t border-line pt-8" aria-label="Related answers">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        More answers
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/answers/${p.slug}`}
            className="group rounded-2xl border border-line p-4 transition-colors hover:bg-surface"
          >
            <span className="font-display font-medium leading-snug text-ink transition-colors group-hover:text-accent-ink">
              {p.question || p.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
