# Migration plan — Vite → Next.js

Living document. Update the checkboxes as each phase lands; never delete a phase
when it's done, so future readers can trace the migration.

See [architecture.md](./architecture.md) for stack decisions and the *why*.

---

## Ground rules

1. **The Vite site stayed live until phase 8.** Phase 8 removed the active Vite
   root; the Next.js app then flattened up to the repo root.
2. **One phase per session.** A phase is small enough to verify end-to-end in
   one sitting and reversible if it goes wrong.
3. **Default verification stays light.** Use `pnpm check` (Biome + tsc) and
   `pnpm build` for normal slices. Run browser smoke checks only when a change
   materially touches layout, interaction, routing, or cutover-critical
   behavior.
4. **Schema is frozen.** We do not modify [docs/migrations](./migrations/) during
   this migration. Supabase tables/RLS stay exactly as they are.
5. **Legacy Vite validators are retired.** Current verification is Biome,
   TypeScript, and `next build`; browser smoke is risk-based.

## Current status — 2026-05-18

The single deployable app is the Next.js workspace at the repo root (flattened
in commit after `0d2b58f`). A production `pnpm build` passes and prerenders:

- `/`
- `/available`
- `/sold`
- `/journal`
- `/journal/[slug]`
- `/watch/[slug]`

Public storefront reads use a cookie-free, server-only Supabase anon client so
`generateStaticParams`, metadata generation, and ISR can run during build. The
cookie-aware `@supabase/ssr` client remains reserved for authenticated/admin
work and Server Actions.

The codebase cutover is complete. Vite source/build files have been removed,
and static legacy bridges for `/admin`, `/privacy`, `/terms`, and
`/authenticity` live in [../public](../public). Vercel auto-detects the
Next.js framework preset from the root `package.json`; the explicit
[../vercel.json](../vercel.json) pins clean-URL behavior.

---

## Phase 1 — Foundation

**Goal**: Next.js app boots, design tokens carry over, Supabase connects, the
homepage renders the arrivals carousel from live Supabase data via a Server
Component. **Done = one route working end-to-end on the new stack.**

- [x] Scaffold `next/` with Next.js (latest), TypeScript strict, Tailwind v4, Turbopack
- [x] Biome configured (lint + format)
- [x] `next/src/app/globals.css` — Tailwind v4 `@theme` block carrying all design tokens (navy/cream/gold + opacity variants)
- [x] `next/src/app/layout.tsx` — `next/font` for Petrona, Spectral, JetBrains Mono
- [x] shadcn/ui initialized, themed to the WA palette (CSS variable overrides)
- [x] `@supabase/ssr` installed; `lib/supabase/server.ts` + `client.ts` + `admin.ts`
- [x] Environment surface: `.env.local` keys documented in `next/.env.example`
- [x] `lib/inventory/normalize.ts` — single function turning a Supabase row into a domain `Watch`
- [x] `app/page.tsx` — homepage Server Component
- [x] `components/storefront/HeroSection.tsx` — Server Component
- [x] `components/storefront/ArrivalsCarousel.tsx` — Server Component with a small client controls island
- [x] Keep `WatchCard` out of the client bundle by splitting carousel controls from card rendering
- [x] `components/storefront/MainNav.tsx`, `TopBar.tsx` — Server Components
- [ ] Native `Footer.tsx` — pending; legacy legal links are bridged through static pages
- [x] `next/CLAUDE.md` — per-app conventions for future sessions (component boundaries, where things go, lint commands)
- [ ] Lightweight route smoke check for `/`, `/available`, `/sold`, `/journal`, and one `/watch/[slug]` after the route set stabilizes
- [ ] Commit + push

**Out of scope for phase 1**: modal, inquiry form, sold/available/journal pages, admin, image upload, ISR.

---

## Phase 2 — Storefront read paths

- [x] `app/available/page.tsx` — Server Component with full grid
- [x] `app/sold/page.tsx` — Server Component, ledger style
- [x] `components/storefront/WatchCard.tsx` — shared between homepage + /available
- [x] `components/storefront/SoldRow.tsx` — used on /sold
- [x] FX (PHP → USD) helper as a Client Component, no global script
- [x] Replace homepage `#news` Dispatches section with Server-fetched journal previews

---

## Phase 3 — Watch detail pages with ISR

- [x] `app/watch/[slug]/page.tsx` — Static + `revalidate: 60`
- [x] `generateStaticParams` from published watches
- [x] `generateMetadata` for per-watch OG + canonical
- [x] Schema.org `Product` JSON-LD
- [ ] Native admin saves call `revalidatePath('/watch/[slug]')` to publish instantly
- [x] Retire `scripts/generate-watch-pages.mjs` (kept in git history, removed from postbuild)

---

## Phase 4 — Journal

- [x] `app/journal/page.tsx` — index, Server Component
- [x] `app/journal/[slug]/page.tsx` — post, ISR
- [x] `lib/journal/markdown.ts` — safe-by-default markdown renderer (existing helper ported)
- [x] Retire `scripts/generate-journal-pages.mjs`

---

## Phase 5 — Inquiry flow

- [ ] `components/storefront/InquiryDialog.tsx` — shadcn Dialog, Client Component
- [ ] `app/(storefront)/actions/inquire.ts` — Server Action with Zod schema
- [ ] Honeypot + simple rate limit (IP + minute bucket via Supabase RPC)
- [ ] Existing `inquiry-notify` Edge Function continues to fire (no change to the function itself)

---

## Phase 6 — Admin

- [x] Preserve current operator admin as a static legacy bridge under `next/public/admin`
- [ ] `proxy.ts` at `next/src/proxy.ts` — checks Supabase session on every `/admin/**` request
- [ ] `app/admin/login/page.tsx` — Supabase Auth UI (email + password recovery, mirroring current behavior)
- [ ] `app/admin/page.tsx` — Dashboard with KPIs, top watches, recent activity (mirrors `validate-admin-dashboard.mjs` contract)
- [ ] `app/admin/inventory/page.tsx` — table + create/edit drawers as shadcn Sheets
- [ ] `app/admin/journal/page.tsx` — list + editor (markdown preview)
- [ ] `app/admin/inquiries/page.tsx` — inbox
- [ ] Server Actions for every mutation; service-role client used **only** inside Server Actions, never imported into a component
- [ ] Image upload Server Action that proxies to Supabase Storage (no client-side service-role exposure)

---

## Phase 7 — Tests

- [ ] Lightweight route checks covering storefront, detail pages, and legacy bridge routes
- [ ] Vitest covering domain logic in `lib/inventory`, `lib/journal`, `lib/fx`, `lib/schema`
- [ ] CI in `.github/workflows/` runs both on every push
- [x] Old Vite validators deleted during phase 8 cutover

---

## Phase 8 — Cutover

- [x] Codebase prepared for Vercel project root directory `next/`
- [x] `next/vercel.json` pins the framework preset to `nextjs`
- [x] Replace legacy root `vercel.json` after production cutover
- [ ] Production domain `thewatchalley.com` cut over
- [ ] Smoke test all routes against production for ≥48h
- [x] Delete from repo root: `index.html`, `journal.html`, `journal-post.html`, `available.html`, `sold.html`, `terms.html`, `privacy.html`, `authenticity.html`, `vite.config.js`, `vercel.json`, `scripts/generate-*.mjs`, `scripts/validate-*.mjs`, `scripts/optimize-images.mjs`, `styles/`
- [x] Move `scripts/transcribe-feedback.mjs` to `next/scripts/`
- [ ] Final commit: `chore: cut over to Next.js, retire Vite stack`
