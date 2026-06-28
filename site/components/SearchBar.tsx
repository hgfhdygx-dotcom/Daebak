import LineIcon from "@/components/LineIcon";

// 공용 검색바 — 홈 Hero · /search 가 같은 스타일을 공유(중복 제거). 클라 JS 불필요(GET form → /search).
export default function SearchBar({
  defaultValue = "",
  placeholder = "Ask about Korea travel, food, or local places…",
  autoFocus = false,
  className = "",
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <form action="/search" role="search" className={className}>
      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
        <LineIcon name="search" className="h-5 w-5 shrink-0 text-ink-soft" />
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label="Search Korea guides"
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          Search
        </button>
      </div>
    </form>
  );
}
