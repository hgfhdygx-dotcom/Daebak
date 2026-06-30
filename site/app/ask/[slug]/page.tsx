import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LineIcon from "@/components/LineIcon";
import GoodButton from "@/components/GoodButton";
import ShareButton from "@/components/ShareButton";
import AskComments from "@/components/AskComments";
import { getPublicAskBySlug, listComments } from "@/lib/questions";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic"; // admin 이 공개/비공개 토글, Good/댓글 실시간

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ask = await getPublicAskBySlug(slug);
  if (!ask) return { title: "Ask Daebak", robots: { index: false } };
  const desc = ask.verdict || ask.summary || "A real question from a foreigner in Korea.";
  const url = `${SITE_URL}/ask/${ask.slug}`;
  return {
    title: ask.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: ask.title, description: desc, url, type: "article" },
    twitter: { card: "summary", title: ask.title, description: desc },
  };
}

export default async function AskDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ask = await getPublicAskBySlug(slug);
  if (!ask) notFound();
  const comments = await listComments(slug);
  const published = ask.publishedAt
    ? new Date(ask.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div className="mx-auto max-w-[760px] px-5 py-10 sm:px-6 lg:py-14">
      <Link href="/ask" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-accent-ink">
        <LineIcon name="arrow-right" className="h-4 w-4 rotate-180" />
        Ask Daebak
      </Link>

      <h1 className="mt-4 font-display text-[clamp(1.7rem,4.5vw,2.5rem)] font-bold leading-[1.12] tracking-tight">
        {ask.title}
      </h1>
      {published ? <p className="mt-2 text-xs text-ink-soft">{published}</p> : null}

      {ask.verdict ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-t-4 border-accent px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Daebak&apos;s verdict</p>
            <p className="mt-2 whitespace-pre-wrap text-lg font-medium leading-relaxed text-ink">{ask.verdict}</p>
          </div>
        </section>
      ) : null}

      {ask.summary ? (
        <p className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-ink-muted">{ask.summary}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <GoodButton slug={ask.slug} initialCount={ask.goodCount} />
        <ShareButton slug={ask.slug} title={ask.title} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">Vote with Good if you want Daebak to answer more questions like this.</p>

      {ask.relatedGuides && ask.relatedGuides.length ? (
        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Related guides</h2>
          <ul className="mt-3 space-y-2">
            {ask.relatedGuides.map((g, i) => (
              <li key={i}>
                <Link href={g.url} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline">
                  {g.label}
                  <LineIcon name="arrow-right" className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AskComments slug={slug} initial={comments} />
    </div>
  );
}
