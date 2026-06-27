# Daebak — Roadmap (계획서)

> **One line:** *Korea discovery platform for foreigners — answers, local picks, products, and trusted links.*
> Q&A is the **trust + traffic engine** (AI cites us → cheap high-intent foreign traffic). Commerce is the **monetization** on top.
> Brand: **Daebak**, by **@kor_punch_boy** (Instagram) — "Real Korea guides, from a local Korean perspective."

---

## What Daebak becomes (and what you become)
- A foreigner asks → finds a clear, **sourced answer with prices/times** → discovers **what to buy / where** → clicks a **trusted (affiliate) link** or **asks**.
- **You = 1-person media + commerce curator/operator** bridging foreign demand ↔ Korean products/brands.
- **Moat = AI citation + trust.** Honest, sourced content is what earns the click that converts. Never fake a pick or a link.

## Revenue streams (돈 수단)
1. **Affiliate** — trusted links = affiliate links. Olive Young Global · YesStyle · Coupang Partners · Stylevana · Gmarket Global · Amazon Associates.
2. **Brand listings / sponsored** — Korean brands pay to be discoverable in English ("For Korean brands → Get listed").
3. **Promotion / marketing service** — help Korean sellers reach global foreigners (guides, product pages, FAQs, search/AI-friendly content).
4. **(Later)** curated storefront / gift boxes / own selection.

---

## Phases

### Phase 0 — Foundation ✅ (done)
- Content pipeline: question → research → synth (GEO levers, no fake sources) → MDX → git push → Vercel → IndexNow.
- Answer pages: at-a-glance picks, **comparison table (PC) / cards (mobile)**, price+time badges, Tip/Good-to-know, FAQ accordion, source chips, SVG icons, sticky header + search, sidebar (quick-pick / recent / Ask CTA).
- **Discovery homepage:** search-as-hero + example chips + trust row, categories, Featured guides, Latest answers (answer-cards w/ badges), Korean product picks (placeholder), Ask Korea, For Korean brands.

### Phase 1 — Go live + first money (next)
- **Deploy:** push current build → `daebak-pi.vercel.app`; attach a real domain (e.g. daebak.kr / getdaebak.com). Set `NEXT_PUBLIC_SITE_URL`.
- **Affiliate signup:** apply to 2-3 programs above; store links.
- **3-5 commerce guides** with REAL picks + affiliate links + sources: *Best Korean sunscreens*, *What to buy in Korea*, *Where to buy Korean fashion online*. These auto-fill Featured + seed Product picks.
- **Category pages** `/[category]` (replace homepage `/search?q=` links); add a `category` field to the pipeline frontmatter.

### Phase 2 — Scale content + traffic
- Pipeline-generate many Q&A (travel/food/rules/beauty) → internal-link into clusters (GEO authority).
- **Product pages** (per product/brand): structured info + price + affiliate + sources.
- Measure AI citations with `D:\geo-tracker`; double down on what gets cited.

### Phase 3 — B2B platform
- "For Korean brands" → real **brand pages / sponsored guides / FAQ pages**, pricing tiers, contact funnel.
- Email capture / newsletter ("What to buy in Korea this month").
- Optional: curated storefront / boxes.

---

## Principles (지키기)
- **Honest only** — real picks, real (affiliate) links, prices dated + sourced; unverifiable → `[VERIFY]`, not invented.
- **AI-crawler friendly** — SSG, robots allows GPTBot/ClaudeBot/PerplexityBot…, FAQ text in HTML + JSON-LD.
- **Schema = what's on screen** (no hidden price-in-schema).
- **Mobile-first**, one accent (Vermilion `#E4502B`), service-feel not blog-feel.

## Tech map
- Pipeline (Python): `D:\foreign-qa` — `research/synthesis/seo/publish.py`.
- Site (Next.js, Vercel **root = `site`**): `D:\foreign-qa\site` — content = `content/answers/*.mdx` (frontmatter contract in `lib/posts.ts`).
- **TODO data models:** `category` (frontmatter), product/brand pages, affiliate-link field.
