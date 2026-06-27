"use client";

import { useEffect, useRef, useState } from "react";
import MegaMenuSection from "@/components/MegaMenuSection";
import { groupByMenu } from "@/lib/presentation";
import type { MenuCategory } from "@/lib/posts";

// 데스크탑 Categories 메가메뉴 — hover + focus-within 으로 열림, Escape/외부클릭 닫힘, aria-expanded.
// 정돈된 3그룹(탐색/여행 · 라이프스타일 · 쇼핑/상품) 레이아웃: 열마다 카테고리 섹션 스택, 그룹 간 얇은 구분선.
// SSG 안전: 링크는 빌드 때 모두 렌더, JS 는 표시 토글만. 데이터(categories)는 서버에서 props.
export default function CategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groups = groupByMenu(categories);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="group relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (ref.current && !ref.current.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        Categories
        <span aria-hidden className="text-[0.6rem]">
          ▾
        </span>
      </button>

      {/* 패널은 항상 DOM 에 렌더(SSG·크롤러·JS off 대비), 표시는 CSS hover/focus + JS open 으로 토글 */}
      <div
        role="menu"
        className={
          "invisible absolute left-0 top-full z-50 mt-2 w-[720px] max-w-[94vw] translate-y-1 rounded-2xl border border-line bg-surface p-5 opacity-0 shadow-[0_18px_44px_-22px_rgba(20,20,20,0.28)] transition-all duration-150 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 " +
          (open ? "!visible !translate-y-0 !opacity-100" : "")
        }
      >
        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-7">
          {groups.map((g, gi) => (
            <div
              key={g.id}
              className={
                "space-y-5 " +
                (gi > 0 ? "sm:border-l sm:border-line/60 sm:pl-7" : "")
              }
            >
              {g.cats.map((c) => (
                <MegaMenuSection
                  key={c.slug}
                  title={c.title}
                  href={c.href}
                  icon={c.icon}
                  items={c.topics.slice(0, 5)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
