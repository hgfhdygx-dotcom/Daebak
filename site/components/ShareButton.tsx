"use client";
import { useState } from "react";
import LineIcon from "@/components/LineIcon";

// Web Share API 있으면 native share, 없으면 URL 복사. 제출자 정보는 절대 공유 안 함(공개 slug URL 만).
export default function ShareButton({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/ask/${slug}` : `/ask/${slug}`;
    const text = `I found this Daebak question: "${title}" — vote and see what people think.`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Daebak", text, url });
        return;
      } catch {
        /* 사용자가 취소 — 복사로 폴백하지 않음 */
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
    >
      <LineIcon name={copied ? "check" : "external"} className="h-4 w-4" />
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
