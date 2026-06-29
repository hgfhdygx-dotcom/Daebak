"use client";
import { useEffect, useState } from "react";

// light / dark / system 3단 토글. 색은 전부 토큰(.dark) → 이 버튼은 .dark 클래스만 토글.
// FOUC 방지는 layout <head> 인라인 스크립트가 담당(이 컴포넌트 마운트 전에 이미 테마 적용됨).
type Theme = "light" | "dark" | "system";

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) || "system";
    setTheme(saved);
    setMounted(true);
  }, []);

  // system 모드면 OS 다크모드 변화를 실시간 반영
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode 등 — 무시 */
    }
    applyTheme(next);
  }

  const cur: Theme = mounted ? theme : "system";
  const label = cur === "light" ? "Light" : cur === "dark" ? "Dark" : "System";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to switch.`}
      title={`Theme: ${label} — click to switch`}
      className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-ink-muted transition-colors hover:border-accent/50 hover:text-accent-ink"
    >
      {cur === "light" ? <SunIcon /> : cur === "dark" ? <MoonIcon /> : <MonitorIcon />}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

const ICON = "h-[18px] w-[18px]";
function SunIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
function MonitorIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
