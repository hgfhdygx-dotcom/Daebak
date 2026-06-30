"use client";
import { useState } from "react";
import LineIcon from "@/components/LineIcon";
import { getVisitorId } from "@/lib/visitor";
import type { AskComment } from "@/lib/questions"; // type-only — 서버 모듈을 클라 번들에 끌어오지 않음

function ago(iso: string): string {
  try {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  } catch {
    return "";
  }
}

// 공개 Ask 상세의 댓글 — 닉네임(선택)+댓글(필수,≤500). 이메일 요구 안 함. 최신순. 욕설/스팸 최소 방어.
export default function AskComments({ slug, initial }: { slug: string; initial: AskComment[] }) {
  const [comments, setComments] = useState<AskComment[]>(initial);
  const [comment, setComment] = useState("");
  const [nickname, setNickname] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ask/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, comment, nickname: nickname || undefined, website, vid: getVisitorId() }),
      });
      const d = await r.json();
      if (d.ok) {
        setComments(d.comments || []);
        setComment("");
      } else {
        setError(
          d.error === "rate_limited"
            ? "Please slow down a moment, then try again."
            : "Keep it clear and under 500 characters, with no spam links.",
        );
      }
    } catch {
      setError("Couldn't post — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold tracking-tight">
        Comments <span className="text-ink-soft">{comments.length}</span>
      </h2>

      <form onSubmit={submit} className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={40}
          placeholder="Nickname (optional)"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent sm:w-64"
        />
        {/* honeypot */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <textarea
          required
          maxLength={500}
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment…"
          className="mt-2 w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent"
        />
        {error ? <p className="mt-2 text-sm text-brand">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "Posting…" : "Post comment"}
        </button>
      </form>

      {comments.length ? (
        <ul className="mt-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs text-ink-soft">
                <span className="font-semibold text-ink-muted">{c.nickname || "Visitor"}</span>
                <span aria-hidden> · </span>
                {ago(c.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{c.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <LineIcon name="sparkles" className="h-4 w-4" />
          Be the first to comment.
        </p>
      )}
    </section>
  );
}
