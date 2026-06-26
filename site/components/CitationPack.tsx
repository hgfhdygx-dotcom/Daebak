import type { CitationPack as CP } from "@/lib/posts";

// 파이프라인 keyFacts 형식: "<fact> — <source url>". 끝의 URL을 분리해 출처 링크로 렌더.
function splitFact(item: string): { text: string; url?: string } {
  const m = item.match(/(https?:\/\/\S+)\s*$/);
  if (!m) return { text: item.trim() };
  const url = m[1].replace(/[).,]+$/, "");
  const text = item.slice(0, m.index).replace(/[\s—–-]+$/, "").trim();
  return { text: text || item.trim(), url };
}

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

// Citation Pack(기법 P) — 복붙용 핵심 사실 + 인용 문장. AI가 가공 0으로 가져가기 좋은 박스.
export default function CitationPack({ pack }: { pack: CP }) {
  const facts = pack.keyFacts ?? [];
  if (facts.length === 0 && !pack.quotable) return null;
  return (
    <aside
      className="mt-8 border border-line bg-surface p-5 sm:p-6"
      aria-label="Key facts"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        Key facts
      </p>
      {facts.length > 0 ? (
        <ul className="mt-3 space-y-2 text-[0.97rem] leading-relaxed">
          {facts.map((f, i) => {
            const { text, url } = splitFact(f);
            return (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-accent">
                  —
                </span>
                <span>
                  {text}{" "}
                  {url ? (
                    <a
                      className="whitespace-nowrap text-accent-ink underline underline-offset-2"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ({domain(url)})
                    </a>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {pack.quotable ? (
        <blockquote className="mt-4 border-l-2 border-accent pl-4 text-ink-muted italic">
          “{pack.quotable}”
        </blockquote>
      ) : null}
    </aside>
  );
}
