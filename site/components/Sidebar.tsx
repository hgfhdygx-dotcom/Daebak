import Link from "next/link";
import type { ParsedTable } from "@/lib/markdownTable";
import type { Post } from "@/lib/posts";

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

// 문의 CTA — 사이드바(데스크톱)와 본문 하단(모바일) 양쪽에서 재사용.
export function AskCta() {
  return (
    <div className="rounded-2xl border border-accent/30 bg-surface p-5">
      <p className="font-display text-base font-semibold text-ink">
        Ask anything about Korea
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Travel, food, transport — ask and I&apos;ll find the real answer, from a
        local Korean.
      </p>
      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Ask on Instagram
      </a>
    </div>
  );
}

// 데스크톱 우측 사이드바: 빠른 선택(비교표의 Best for→Option) · 최신글 · 문의 CTA.
export default function Sidebar({
  table,
  related,
}: {
  table: ParsedTable | null;
  related: Post[];
}) {
  let picks: { when: string; pick: string }[] = [];
  if (table) {
    const bi = table.headers.findIndex((h) => /best/i.test(h));
    if (bi >= 0) {
      picks = table.rows
        .map((r) => ({ when: r[bi], pick: r[0] }))
        .filter((p) => p.when && p.pick)
        .slice(0, 4);
    }
  }

  return (
    <div className="space-y-6">
      {picks.length > 0 ? (
        <div className="rounded-2xl border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Quick pick
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {picks.map((p, i) => (
              <li key={i} className="leading-snug">
                <span className="text-ink-muted">{p.when}</span>
                <span className="mt-0.5 block font-medium text-accent-ink">
                  → {p.pick}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {related.length > 0 ? (
        <div className="rounded-2xl border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Recent answers
          </p>
          <ul className="mt-3 space-y-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/answers/${p.slug}`}
                  className="text-sm font-medium leading-snug text-ink transition-colors hover:text-accent-ink"
                >
                  {p.question || p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AskCta />
    </div>
  );
}
