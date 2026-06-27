import QuickAnswer from "@/components/QuickAnswer";
import WorthItAnswerTemplate from "@/components/WorthItAnswerTemplate";
import { cardIntent } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 상세 상단 답변 블록을 intent 로 분기(데이터 기반). worth_it + 구조 필드 있으면 판단형 템플릿,
// 그 외/필드 없으면 기본 QuickAnswer 로 안전 폴백. 특정 제목 분기 없음.
export default function IntentAnswer({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const hasWorthData = Boolean(
    post.verdict || (post.goodFor && post.goodFor.length) || (post.notFor && post.notFor.length),
  );
  if (intent === "WORTH IT" && hasWorthData) {
    return <WorthItAnswerTemplate post={post} />;
  }
  return <QuickAnswer post={post} />;
}
