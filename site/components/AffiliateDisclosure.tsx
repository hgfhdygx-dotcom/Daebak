import LineIcon from "@/components/LineIcon";
import type { Post } from "@/lib/posts";

const DEFAULT_AFFILIATE =
  "Some links here are affiliate links — if you buy through them, Daebak may earn a small commission at no extra cost to you. It never changes our picks, facts, or sources.";

// 제휴/스폰서 고지 — 조용히, 신뢰 우선. monetization.type 이 affiliate/sponsored 일 때만.
export default function AffiliateDisclosure({ post }: { post: Post }) {
  const m = post.monetization;
  if (!m || !m.type || m.type === "none" || m.type === "local_listing") return null;
  const text =
    m.disclosure ||
    (m.type === "sponsored"
      ? "This page includes a sponsored placement. Our facts and sources stay independent."
      : DEFAULT_AFFILIATE);
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-section px-4 py-3 text-xs leading-relaxed text-ink-muted">
      <LineIcon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" />
      <span>{text}</span>
    </p>
  );
}
