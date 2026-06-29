import Link from "next/link";
import LineIcon from "@/components/LineIcon";

// 작은 'Ask Daebak' CTA — 답변/카테고리 페이지 하단. 검색+질문 수집 흐름의 진입점.
export default function AskInlineCta({ q, className = "" }: { q?: string; className?: string }) {
  return (
    <div
      className={
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-section px-5 py-4 " +
        className
      }
    >
      <p className="text-sm text-ink-muted">Still confused? Ask Daebak — we answer real questions.</p>
      <Link
        href={q ? `/ask?q=${encodeURIComponent(q)}` : "/ask"}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white"
      >
        Ask Daebak
        <LineIcon name="arrow-right" className="h-4 w-4" />
      </Link>
    </div>
  );
}
