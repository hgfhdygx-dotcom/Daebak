"use client";
import { useState } from "react";
import Link from "next/link";
import LineIcon from "@/components/LineIcon";

// 로그인 없이 질문 제출 — 검색으로 답이 없을 때 자연스럽게. 제출 후 status 링크(+이메일 안내).
// 키 미설정/스팸/길이 등은 친절 메시지로. honeypot(website) 로 봇 차단.
type Result = { statusPath: string; hadEmail: boolean; displayId?: string } | null;

function messageFor(error?: string): string {
  switch (error) {
    case "too_short": return "Please keep your question clear and specific.";
    case "too_long": return "That's a bit long — please shorten your question.";
    case "too_many_links": return "Please remove the extra links from your question.";
    case "rate_limited": return "You've sent a few questions already — please try again in a minute.";
    case "not_configured": return "Question submissions aren't available right now. Please try again later.";
    default: return "Something went wrong. Please try again.";
  }
}

export default function AskDaebak({
  initialQuestion = "",
  sourceComponent = "ask_page",
  sourcePage,
  className = "",
  examples = [],
}: {
  initialQuestion?: string;
  sourceComponent?: "home_search" | "search_page" | "answer_page" | "category_page" | "ask_page";
  sourcePage?: string;
  className?: string;
  examples?: string[]; // 클릭하면 질문칸에 채워지는 예시
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans never see it
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          email: email || undefined,
          name: name || undefined,
          notifyOnAnswer: Boolean(email),
          website,
          sourceComponent,
          sourcePage: sourcePage || (typeof window !== "undefined" ? window.location.pathname : undefined),
          language: typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en",
        }),
      });
      const data = await res.json();
      if (data.ok) setResult({ statusPath: data.statusPath || "", hadEmail: Boolean(email), displayId: data.displayId });
      else setError(messageFor(data.error));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function copyLink(path: string) {
    const url = typeof window !== "undefined" ? window.location.origin + path : path;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (result) {
    return (
      <div className={"rounded-2xl border border-line bg-surface p-5 sm:p-6 " + className}>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-trust">
          <LineIcon name="check" className="h-4 w-4" strokeWidth={2.25} />
          Question sent
        </p>
        {result.displayId ? (
          <p className="mt-2 text-sm font-semibold text-ink">
            Your question ID: <span className="text-accent-ink">{result.displayId}</span>
          </p>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {result.hadEmail
            ? "Thanks — your question was sent to Daebak. If we publish an answer, we may email you the link. You can also check the status here."
            : "Thanks — your question was sent to Daebak. Save this link to check if we answer it later."}
        </p>
        {result.statusPath ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={result.statusPath}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Check my question
              <LineIcon name="arrow-right" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => copyLink(result.statusPath)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
            >
              <LineIcon name={copied ? "check" : "external"} className="h-4 w-4" />
              {copied ? "Copied" : "Copy status link"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={"rounded-2xl border border-line bg-surface p-5 sm:p-6 " + className}>
      <label htmlFor="ask-q" className="block text-sm font-semibold text-ink">
        Ask Daebak
      </label>
      <p className="mt-1 text-sm text-ink-muted">
        We review real questions to create better Korea guides. No login required.
      </p>
      <textarea
        id="ask-q"
        required
        maxLength={1000}
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. What should I buy at Olive Young?"
        className="mt-3 w-full resize-y rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent"
      />

      {examples.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuestion(ex)}
              className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      ) : null}

      {/* honeypot — 시각적으로 숨김, 봇만 채움 */}
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ask-email" className="text-xs font-medium text-ink-muted">
            Email <span className="text-ink-soft">(optional)</span>
          </label>
          <input
            id="ask-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3.5 py-2 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="ask-name" className="text-xs font-medium text-ink-muted">
            Name <span className="text-ink-soft">(optional)</span>
          </label>
          <input
            id="ask-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3.5 py-2 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent"
          />
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-brand">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? "Sending…" : "Ask Daebak"}
        {!busy ? <LineIcon name="arrow-up-right" className="h-4 w-4" /> : null}
      </button>
    </form>
  );
}
