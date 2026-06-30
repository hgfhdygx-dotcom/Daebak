"use client";
import { useEffect, useState } from "react";
import LineIcon from "@/components/LineIcon";
import { getVisitorId } from "@/lib/visitor";

// 공개 Ask 의 Good(좋아요). Bad/Dislike 없음. localStorage + 서버 IP·vid 해시로 중복 방지.
export default function GoodButton({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`daebak_good_${slug}`)) setDone(true);
    } catch {
      /* ignore */
    }
  }, [slug]);

  async function good() {
    if (done || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/ask/good", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, vid: getVisitorId() }),
      });
      const d = await r.json();
      if (d.ok) {
        if (d.result === "added") setCount((c) => c + 1);
        setDone(true);
        try {
          localStorage.setItem(`daebak_good_${slug}`, "1");
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={good}
      disabled={done || busy}
      aria-pressed={done}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors " +
        (done
          ? "border-accent bg-accent-soft text-accent-ink"
          : "border-line text-ink-muted hover:border-accent hover:text-accent-ink")
      }
    >
      <LineIcon name={done ? "check" : "sparkles"} className="h-4 w-4" />
      Good
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
