import AnswerCard from "@/components/AnswerCard";
import type { Post } from "@/lib/posts";

// "Popular local guides" — 상위 발행 가이드를 인텐트 라벨 카드로(데이터 기반).
export default function PopularGuides({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold tracking-tight">First things travelers ask</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((p) => (
          <AnswerCard key={p.slug} post={p} variant="list" />
        ))}
      </div>
    </section>
  );
}
