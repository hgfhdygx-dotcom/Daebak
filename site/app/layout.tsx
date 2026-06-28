import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import CategoriesMenu from "@/components/CategoriesMenu";
import ClusterIcon from "@/components/ClusterIcon";
import LineIcon from "@/components/LineIcon";
import { getCategoryNav } from "@/lib/posts";
import { groupByMenu } from "@/lib/presentation";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const INSTAGRAM = "https://instagram.com/kor_punch_boy";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: SITE_URL },
};

function SiteHeader() {
  const nav = getCategoryNav();
  const navOrdered = groupByMenu(nav).flatMap((g) => g.cats); // 모바일도 데스크탑과 같은 그룹 순서
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1760px] items-center gap-4 px-5 sm:px-6 lg:px-8">
        {/* 왼쪽: 브랜드 + 만든이 + 메뉴 */}
        <div className="flex items-center gap-5">
          <div className="flex items-center leading-none">
            <Link href="/" aria-label={SITE_NAME} className="inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/daebak-logo-horizontal.svg"
                alt={SITE_NAME}
                width={89}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <CategoriesMenu categories={nav} />
            <Link
              href="/#for-brands"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              For Brands
            </Link>
          </nav>
        </div>

        {/* 오른쪽: 검색만 (모바일은 아이콘 + 메뉴 버튼) */}
        <div className="ml-auto flex items-center gap-2">
          <form action="/search" role="search" className="hidden sm:block">
            <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
              <LineIcon name="search" className="h-4 w-4 shrink-0 text-ink-soft" />
              <input
                name="q"
                type="search"
                placeholder="Search Korea guides…"
                aria-label="Search Korea guides"
                className="w-44 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
          </form>

          <Link
            href="/search"
            aria-label="Search Korea guides"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:text-accent-ink sm:hidden"
          >
            <LineIcon name="search" className="h-[18px] w-[18px]" />
          </Link>

          {/* 모바일 메뉴 (네이티브 details — JS 0) */}
          <details className="relative sm:hidden">
            <summary
              aria-label="Menu"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line text-ink-muted [&::-webkit-details-marker]:hidden"
            >
              <LineIcon name="menu" className="h-[18px] w-[18px]" />
            </summary>
            <div className="absolute right-0 z-50 mt-2 max-h-[72vh] w-64 overflow-auto rounded-2xl border border-line bg-surface p-2 shadow-lg">
              {navOrdered.map((c) => (
                <details key={c.slug} className="border-b border-line/60 last:border-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-section text-accent-ink">
                        <ClusterIcon kind={c.icon} className="h-3.5 w-3.5" />
                      </span>
                      {c.title}
                    </span>
                    <span aria-hidden className="text-xs text-ink-muted">
                      ＋
                    </span>
                  </summary>
                  <ul className="pb-2 pl-10">
                    {c.topics.slice(0, 5).map((t, i) => (
                      <li key={i}>
                        <Link
                          href={t.href}
                          className="block rounded-md py-1.5 text-[0.82rem] text-ink-muted transition-colors hover:text-accent-ink"
                        >
                          {t.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
              <Link
                href="/#for-brands"
                className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink hover:bg-section"
              >
                For Brands
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-[1760px] px-5 py-10 sm:px-6 lg:px-8">
        <p className="font-display text-base font-semibold text-ink">
          {SITE_NAME}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Real Korea guides, written from a local Korean perspective.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Created by{" "}
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="text-accent-ink underline underline-offset-2"
          >
            @kor_punch_boy
          </a>{" "}
          ·{" "}
          <Link
            href="/about"
            className="text-accent-ink underline underline-offset-2"
          >
            About &amp; sources
          </Link>
        </p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
