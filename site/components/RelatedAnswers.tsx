import Link from "next/link";
import type { Post } from "@/lib/posts";

// 관련 답변 내부 링크 — 사이드바(토픽 클러스터 GEO 내부링크 겸용).
// 카테고리가 아직 없으므로 최근 다른 답변으로 채운다(추후 카테고리 기반으로 교체 가능).
export default function RelatedAnswers({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <nav aria-label="Related answers">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        More answers
      </h2>
      <ul className="mt-4 space-y-4">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/answers/${p.slug}`} className="group block">
              <span className="block font-medium leading-snug transition-colors group-hover:text-accent-ink">
                {p.question || p.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
