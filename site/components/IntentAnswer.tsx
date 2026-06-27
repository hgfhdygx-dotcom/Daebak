import QuickAnswer from "@/components/QuickAnswer";
import WorthItAnswerTemplate from "@/components/WorthItAnswerTemplate";
import PriceFirstTemplate from "@/components/PriceFirstTemplate";
import TimeFirstTemplate from "@/components/TimeFirstTemplate";
import StepsTemplate from "@/components/StepsTemplate";
import RecommendationTemplate from "@/components/RecommendationTemplate";
import BuyingTemplate from "@/components/BuyingTemplate";
import { cardIntent } from "@/lib/cardIntent";
import type { Post } from "@/lib/posts";

// 상세 상단 답변 블록을 intent(데이터 기반)로 분기 — 특정 제목/슬러그 분기 절대 없음.
// 각 템플릿은 구조 필드 없으면 기존 데이터로 안전 폴백(의도별 정렬·헤딩만 유지).
export default function IntentAnswer({ post }: { post: Post }) {
  const intent = cardIntent(post);
  const text = `${post.question || post.title || ""}`;
  const hasWorthData = Boolean(
    post.verdict || (post.goodFor && post.goodFor.length) || (post.notFor && post.notFor.length),
  );

  if (intent === "WORTH IT" && hasWorthData) return <WorthItAnswerTemplate post={post} />;
  if (intent === "CHEAPEST" || intent === "PRICE" || /COST$/.test(intent))
    return <PriceFirstTemplate post={post} />;
  if (intent === "FASTEST") return <TimeFirstTemplate post={post} />;
  if (intent === "BEST PICK" || intent === "TOP PICKS") return <RecommendationTemplate post={post} />;
  if (intent === "WHERE TO BUY" || intent === "WHAT TO BUY") return <BuyingTemplate post={post} />;
  if (post.pageType === "route" || post.pageType === "planning" || /\bhow (do|to|can)\b/i.test(text))
    return <StepsTemplate post={post} />;

  return <QuickAnswer post={post} />;
}
