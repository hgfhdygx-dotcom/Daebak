import type { Metadata } from "next";
import Link from "next/link";
import LineIcon from "@/components/LineIcon";
import { getPublicQuestion } from "@/lib/questions";

export const dynamic = "force-dynamic"; // token 별 서버 렌더(캐시/정적화 안 함)
export const metadata: Metadata = {
  title: "Your question · Daebak",
  robots: { index: false, follow: false },
};

const STATUS_COPY: Record<string, { label: string; text: string; tone: string }> = {
  new: { label: "Received", text: "We received your question.", tone: "text-ink-muted" },
  reviewing: { label: "Reviewing", text: "Daebak is reviewing this question.", tone: "text-accent-ink" },
  draft_created: { label: "Answer in progress", text: "An answer draft is being prepared.", tone: "text-accent-ink" },
  answered: { label: "Answered", text: "We've answered this question.", tone: "text-trust" },
  published: { label: "Answered", text: "We answered this question.", tone: "text-trust" },
  rejected: { label: "Closed", text: "We couldn't answer this question yet.", tone: "text-ink-muted" },
};

function NotFound() {
  return (
    <div className="mx-auto max-w-[560px] px-5 py-16 text-center sm:px-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">No question found</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        We couldn&apos;t find an active question for this link. The link may be incorrect or no longer
        available.
      </p>
      <Link href="/ask" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
        Ask a new question
        <LineIcon name="arrow-right" className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function StatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q = await getPublicQuestion(token);
  // not found / not configured / spam → generic (관리자 정보·이유 노출 금지)
  if (!q || q.status === "spam") return <NotFound />;

  const copy = STATUS_COPY[q.status] || STATUS_COPY.new;
  const submitted = (() => {
    try {
      return new Date(q.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  })();
  const isPublished = (q.status === "published" || q.status === "answered") && q.publishedUrl;

  return (
    <div className="mx-auto max-w-[640px] px-5 py-12 sm:px-8 lg:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Your question</p>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="font-display text-lg font-bold leading-snug tracking-tight text-ink">
          {q.question}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          {submitted ? <span>Submitted {submitted}</span> : null}
          {q.categoryGuess ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>·</span>
              {q.categoryGuess}
            </span>
          ) : null}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${copy.tone}`}>
            <LineIcon name={isPublished ? "check" : "clock"} className="h-4 w-4" strokeWidth={2.25} />
            {copy.label}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{copy.text}</p>

          {isPublished ? (
            <Link
              href={q.publishedUrl as string}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Read the guide
              <LineIcon name="arrow-right" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      <p className="mt-5 text-xs text-ink-soft">
        Bookmark this page to check back. We review every real question to build better Korea guides.
      </p>
      <Link href="/ask" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
        Ask another question
        <LineIcon name="arrow-right" className="h-4 w-4" />
      </Link>
    </div>
  );
}
