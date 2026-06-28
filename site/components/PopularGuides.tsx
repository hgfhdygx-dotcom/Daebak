import AnswerCard from "@/components/AnswerCard";
import { distinctCardIcons } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// "Popular local guides" — 상위 발행 가이드를 인텐트 라벨 카드로(데이터 기반). 같은 페이지 아이콘 중복 회피.
export default function PopularGuides({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  const icons = distinctCardIcons(posts);
  return (
    <section>
      <h2 className="font-display text-lg font-bold tracking-tight">First things travelers ask</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((p, i) => (
          <AnswerCard key={p.slug} post={p} variant="list" icon={icons[i]} />
        ))}
      </div>
    </section>
  );
}
