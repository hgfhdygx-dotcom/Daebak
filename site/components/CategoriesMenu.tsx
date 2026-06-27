"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClusterIcon from "@/components/ClusterIcon";
import type { MenuCategory } from "@/lib/posts";

// 데스크탑 Categories 메가메뉴 — hover + focus-within 으로 열림, Escape/외부클릭 닫힘, aria-expanded.
// SSG 안전: 링크는 빌드 때 모두 렌더, JS 는 표시 토글만. 데이터(categories)는 서버에서 props.
export default function CategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          "invisible absolute left-0 top-full z-50 mt-2 w-[640px] max-w-[92vw] translate-y-1 rounded-2xl border border-line bg-surface p-4 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 " +
          (open ? "!visible !translate-y-0 !opacity-100" : "")
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {categories.map((c) => (
            <div key={c.slug}>
              <Link
                href={c.href}
                className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-ink transition-colors hover:text-accent-ink"
              >
                <span className="text-accent-ink">
                  <ClusterIcon kind={c.icon} className="h-4 w-4" />
                </span>
                {c.title}
              </Link>
              <ul className="mt-1.5 space-y-1">
                {c.topics.map((t, i) => (
                  <li key={i}>
                    <Link
                      href={t.href}
                      className="block text-[0.8rem] text-ink-muted transition-colors hover:text-accent-ink"
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
