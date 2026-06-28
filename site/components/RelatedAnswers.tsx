import AnswerCard from "@/components/AnswerCard";
import { distinctCardIcons } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 관련 답변 — 공용 ArticleCard(AnswerCard)로 통일(별도 카드 스타일 금지). 토픽 클러스터 GEO 내부링크 겸용.
export default function RelatedAnswers({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  const icons = distinctCardIcons(posts);
  return (
    <section className="mt-14 border-t border-line pt-8" aria-label="Related answers">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        More answers
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {posts.map((p, i) => (
          <AnswerCard key={p.slug} post={p} variant="list" icon={icons[i]} />
        ))}
      </div>
    </section>
  );
}
