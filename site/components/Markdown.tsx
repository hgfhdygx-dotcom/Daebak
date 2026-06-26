import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// MDX 본문(GitHub Markdown) 렌더. remark-gfm으로 표/취소선 등 GFM 지원.
export default function Markdown({ children }: { children: string }) {
  return (
    <div
      className="prose prose-neutral mt-4 max-w-none
        prose-headings:font-display prose-headings:tracking-tight
        prose-p:text-ink prose-p:leading-relaxed
        prose-li:text-ink
        prose-strong:text-ink
        prose-a:text-accent-ink prose-a:underline prose-a:underline-offset-2
        prose-th:bg-surface"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
