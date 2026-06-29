import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { ReactNode } from "react";
import LineIcon from "@/components/LineIcon";

// hast 노드 → 평문(모바일 카드용 셀 텍스트 추출).
function nodeText(n: any): string {
  if (!n) return "";
  if (n.type === "text") return n.value || "";
  if (Array.isArray(n.children)) return n.children.map(nodeText).join("");
  return "";
}

// 표: 데스크톱은 일반 표, 모바일은 각 행을 카드로 (눈에 잘 들어오게).
function MdTable({ node, children }: { node?: any; children?: ReactNode }) {
  const headers: string[] = [];
  const rows: string[][] = [];
  for (const section of node?.children ?? []) {
    const isHead = section.tagName === "thead";
    for (const tr of section.children ?? []) {
      if (tr.tagName !== "tr") continue;
      const cells = (tr.children ?? [])
        .filter((c: any) => c.tagName === "th" || c.tagName === "td")
        .map(nodeText);
      if (isHead) headers.push(...cells);
      else rows.push(cells);
    }
  }
  return (
    <div className="my-7">
      {/* 데스크톱 표 */}
      <div className="hidden rounded-2xl border border-line sm:block">
        <table className="w-full table-auto border-collapse text-[0.95rem]">
          {children}
        </table>
      </div>
      {/* 모바일 카드 */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            {row.map((cell, j) => (
              <div
                key={j}
                className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0"
              >
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {headers[j] ?? ""}
                </span>
                <span className="text-right text-[0.95rem] text-ink">{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 인용블록(>) → 하이라이트 박스(Tip / Good to know).
function Callout({ children }: { children?: ReactNode }) {
  return (
    <div className="not-prose my-6 flex gap-3 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
      <LineIcon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" />
      <div className="text-[0.97rem] leading-relaxed text-ink [&_a]:text-accent-ink [&_a]:underline [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:font-semibold">
        {children}
      </div>
    </div>
  );
}

const components = {
  table: MdTable,
  blockquote: Callout,
} as Components;

// MDX 본문(GitHub Markdown) 렌더. 표·인용블록은 카드/박스로, 굵은 핵심어는 단청 밑줄(.prose-marker)로.
export default function Markdown({ children }: { children: string }) {
  return (
    <div
      className="prose prose-marker prose-neutral dark:prose-invert mt-2 max-w-none text-[1.02rem]
        prose-headings:font-display prose-headings:tracking-tight prose-headings:mt-10 prose-headings:mb-3
        prose-h2:text-[1.6rem] prose-h3:text-xl
        prose-p:text-ink prose-p:leading-[1.75]
        prose-li:text-ink prose-li:my-1
        prose-strong:text-ink
        prose-a:text-accent-ink prose-a:underline prose-a:underline-offset-2
        prose-th:bg-th prose-th:text-left prose-td:align-top"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
