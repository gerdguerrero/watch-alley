# Migration plan — Vite → Next.js

Living document. Update the checkboxes as each phase lands; never delete a phase
when it's done, so future readers can trace the migration.

See [architecture.md](./architecture.md) for stack decisions and the *why*.

---

## Ground rules

1. **The Vite site stays live until phase 8.** Every phase lands in [next/](../next/);
   nothing at the repo root changes (except docs) until cutover.
2. **One phase per session.** A phase is small enough to verify end-to-end in
   one sitting and reversible if it goes wrong.
3. **No phase ships without a real browser test.** Playwright headless run +
   manual eyeball on the dev server before committing.
4. **Schema is frozen.** We do not modify [docs/migrations](./migrations/) during
   this migration. Supabase tables/RLS stay exactly as they are.
5. **Validators (`scripts/validate-*.mjs`) keep guarding the Vite site** until
   phase 7 replaces them. Both stacks coexist; both must stay green.

---

## Phase 1 — Foundation

**Goal**: Next.js app boots, design tokens carry over, Supabase connects, the
homepage renders the arrivals carousel from live Supabase data via a Server
Component. **Done = one route working end-to-end on the new stack.**

- [ ] Scaffold `next/` with Next.js (latest), TypeScript strict, Tailwind v4, Turbopack
- [ ] Biome configured (lint + format)
- [ ] `next/src/styles/globals.css` — Tailwind v4 `@theme` block carrying all design tokens (navy/cream/gold + opacity variants)
- [ ] `next/src/app/layout.tsx` — `next/font` for Petrona, Spectral, JetBrains Mono
- [ ] shadcn/ui initialized, themed to the WA palette (CSS variable overrides)
- [ ] `@supabase/ssr` installed; `lib/supabase/server.ts` + `client.ts` + `admin.ts`
- [ ] Environment surface: `.env.local` keys documented in `next/.env.example`
- [ ] `lib/inventory/normalize.ts` — single function turning a Supabase row into a domain `Watch`
- [ ] `app/(storefront)/page.tsx` — homepage Server Component
- [ ] `components/storefront/HeroSection.tsx` — Server Component
- [ ] `components/storefront/ArrivalsCarousel.tsx` — Client Component, hydrates with server-fetched data
- [ ] `components/storefront/MainNav.tsx`, `TopBar.tsx`, `Footer.tsx` — Server Components
- [ ] `next/CLAUDE.md` — per-app conventions for future sessions (component boundaries, where things go, lint commands)
- [ ] Playwright smoke spec hitting `localhost:3000/` — proves cards render, no console errors, JS event loop responsive
- [ ] Commit + push

**Out of scope for phase 1**: modal, inquiry form, sold/available/journal pages, admin, image upload, ISR.

---

## Phase 2 — Storefront read paths

- [ ] `app/(storefront)/available/page.tsx` — Server Component with full grid
- [ ] `app/(storefront)/sold/page.tsx` — Server Component, ledger style
- [ ] `components/storefront/WatchCard.tsx` — shared between homepage + /available
- [ ] `components/storefront/SoldRow.tsx` — used on /sold
- [ ] FX (PHP → USD) helper as a Client Component, no global script
- [ ] Replace homepage `#news` Dispatches section with Server-fetched journal previews

---

## Phase 3 — Watch detail pages with ISR

- [ ] `app/(storefront)/watch/[slug]/page.tsx` — Static + `revalidate: 60`
- [ ] `generateStaticParams` from published watches
- [ ] `generateMetadata` for per-watch OG + canonical
- [ ] Schema.org `Product` JSON-LD
- [ ] Admin saves call `revalidatePath('/watch/[slug]')` to publish instantly
- [ ] Retire `scripts/generate-watch-pages.mjs` (kept in git history, removed from postbuild)

---

## Phase 4 — Journal

- [ ] `app/(storefront)/journal/page.tsx` — index, Server Component
- [ ] `app/(storefront)/journal/[slug]/page.tsx` — post, ISR
- [ ] `lib/journal/renderMarkdown.ts` — safe-by-default markdown renderer (existing helper ported)
- [ ] Retire `scripts/generate-journal-pages.mjs`

---

## Phase 5 — Inquiry flow

- [ ] `components/storefront/InquiryDialog.tsx` — shadcn Dialog, Client Component
- [ ] `app/(storefront)/actions/inquire.ts` — Server Action with Zod schema
- [ ] Honeypot + simple rate limit (IP + minute bucket via Supabase RPC)
- [ ] Existing `inquiry-notify` Edge Function continues to fire (no change to the function itself)

---

## Phase 6 — Admin

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

- [ ] Playwright specs covering every contract currently asserted by `scripts/validate-*.mjs` (one spec per behavior, not one per validator)
- [ ] Vitest covering domain logic in `lib/inventory`, `lib/journal`, `lib/fx`, `lib/schema`
- [ ] CI in `.github/workflows/` runs both on every push
- [ ] Old validators kept until phase 8 cutover, then deleted

---

## Phase 8 — Cutover

- [ ] Vercel project root directory pointed at `next/`
- [ ] `vercel.ts` config in `next/` with rewrites/headers (replaces `vercel.json`)
- [ ] Production domain `thewatchalley.com` cut over
- [ ] Smoke test all routes against production for ≥48h
- [ ] Delete from repo root: `index.html`, `journal.html`, `journal-post.html`, `available.html`, `sold.html`, `terms.html`, `privacy.html`, `authenticity.html`, `vite.config.js`, `vercel.json`, `scripts/generate-*.mjs`, `scripts/validate-*.mjs`, `scripts/optimize-images.mjs`, `styles/`
- [ ] Move `scripts/transcribe-feedback.mjs` to `next/scripts/`
- [ ] Final commit: `chore: cut over to Next.js, retire Vite stack`
