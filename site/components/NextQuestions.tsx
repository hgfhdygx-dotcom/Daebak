import Link from "next/link";
import type { Post } from "@/lib/posts";

// 본문 중간 "다음 질문" 카드(§18) — 같은 클러스터 흐름으로 독자를 이어준다(기법 Z 경로 설계).
export default function NextQuestions({
  posts,
  heading = "Next questions",
}: {
  posts: Post[];
  heading?: string;
}) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="my-10 rounded-2xl border border-line bg-section p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">
        {heading}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/answers/${p.slug}`}
            className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm transition-shadow hover:shadow-sm"
          >
            <span className="min-w-0 truncate text-ink transition-colors group-hover:text-accent-ink">
              {p.question || p.title}
            </span>
            <span aria-hidden className="shrink-0 text-ink-muted">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
