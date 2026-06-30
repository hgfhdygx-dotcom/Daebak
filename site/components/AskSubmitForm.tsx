"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LineIcon from "@/components/LineIcon";
import { ASK_EXAMPLES } from "@/components/AskDaebak";

// /ask 제출 폼 — 이메일 필수. 성공 시 private 제출확인 페이지로 이동. honeypot + 길이/URL 방어.
function messageFor(error?: string): string {
  switch (error) {
    case "email_required":
      return "Please enter a valid email — we only use it to follow up.";
    case "too_short":
      return "Please write a clearer question.";
    case "too_long":
      return "That's a bit long — please shorten it.";
    case "too_many_links":
      return "Please remove the extra links.";
    case "rate_limited":
      return "You've sent a few already — please try again in a minute.";
    case "not_configured":
      return "Submissions aren't available right now. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AskSubmitForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          email,
          name: name || undefined,
          notifyOnAnswer: true,
          requireEmail: true,
          website,
          sourceComponent: "ask_page",
          sourcePage: "/ask",
          language: typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en",
        }),
      });
      const d = await r.json();
      if (d.ok && d.statusPath) router.push(d.statusPath);
      else setError(messageFor(d.error));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <label htmlFor="ask-q" className="block text-sm font-semibold text-ink">
        Your question
      </label>
      <textarea
        id="ask-q"
        required
        maxLength={1000}
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Is Myeongdong a tourist trap?"
        className="mt-2 w-full resize-y rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-accent"
      />

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ASK_EXAMPLES.map((ex) => (
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ask-email" className="text-xs font-medium text-ink-muted">
            Email <span className="text-brand">*</span>
          </label>
          <input
            id="ask-email"
            type="email"
            required
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

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Your question will not appear publicly unless Daebak selects it. Your email is never shown publicly.
      </p>

      {error ? <p className="mt-3 text-sm text-brand">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit question"}
        {!busy ? <LineIcon name="arrow-up-right" className="h-4 w-4" /> : null}
      </button>
    </form>
  );
}
