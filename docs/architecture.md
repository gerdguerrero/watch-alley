# The Watch Alley — Architecture

This document records the stack and the reasoning behind each choice. It is the
single source of truth for "what are we building on" — update it when the answer
changes, not before.

> **Status**: Mid-migration from Vite to Next.js. The Vite site at the repo root
> continues to serve production traffic at `thewatchalley.com` while the Next.js
> app in [next/](../next/) is being built up phase-by-phase. See
> [migration-plan.md](./migration-plan.md) for current phase + checklist.

---

## Stack

| Layer | Choice | Why this, not the alternative |
|---|---|---|
| Framework | **Next.js (App Router, latest stable)** | Server Components, ISR, Routing Middleware — every feature this app needs is platform-native. App Router (not Pages Router) because Server Components let us render storefront pages with Supabase data already in the HTML. |
| Language | **TypeScript, strict mode** | Refactors stay safe. Server Action payloads get inferred end-to-end. `strict: true` is non-negotiable; downgrade-to-loose is a one-way ratchet we don't want to start. |
| Styling | **Tailwind CSS v4 with `@theme` directive** | The current Vite site uses CSS custom properties (`--navy-deep`, `--gold-20`) — Tailwind v4's `@theme` block maps 1:1 to that pattern, so the design tokens carry over without rewriting them. CSS-first config means no JS theme file to drift. |
| Components | **shadcn/ui, heavily themed** | Accessible primitives (Dialog, Sheet, Form) without buying into a kit's visual identity. The Watch Alley look is editorial — we own the styling, shadcn owns the keyboard/ARIA correctness. |
| DB + Auth | **Supabase**, accessed via **`@supabase/ssr`** | Existing project; 15 migrations already in [docs/migrations](./migrations/). The SSR client keeps the anon key server-side on Server Components and refreshes the session on Server Actions. |
| Data reads | **Server Components by default** | Storefront pages render with inventory already in HTML — no loading state, no client-side anon-key exposure. `'use client'` only for genuinely interactive components (carousel, modal). |
| Data writes | **Server Actions** | Inquiry submit, admin CRUD, image upload. Type-safe end-to-end, progressively enhanced (works without JS), no API route boilerplate. |
| Validation | **Zod** at every Server Action boundary | One schema definition produces both the runtime validator and the TypeScript type. Unsafe input never reaches the database. |
| Images | **`next/image`** | Replaces the current manual sharp-based AVIF/WebP pipeline. Auto-AVIF/WebP, automatic sizing, lazy by default. Supabase Storage URLs are added to `images.remotePatterns`. |
| Fonts | **`next/font/google`** for Petrona, Spectral, JetBrains Mono | Self-hosted, preloaded, zero CLS. No FOUT from Google Fonts CDN. |
| Watch detail pages | **Static + ISR** (`revalidate: 60`) | Replaces `scripts/generate-watch-pages.mjs`. New listings live in ≤60 seconds without a redeploy; admin edits propagate via `revalidatePath()`. |
| Admin auth gate | **`proxy.ts` (Next 16 middleware)** | Server-side auth check on every `/admin/**` request before any handler runs. Matches Vercel's current guidance for Next 16; the older `middleware.ts` is deprecated. |
| Linter / formatter | **Biome** | Single binary, ~10× faster than ESLint+Prettier, zero config to start. One source of truth for both rules and formatting. |
| Unit tests | **Vitest** | Same runtime as the Next.js codebase; Server Component test support via `react-server` conditional exports. |
| E2E tests | **Playwright** | Already installed on this machine. Real browser, real Supabase, real edge cases. Replaces the 23 regex-based validators in `scripts/validate-*.mjs`. |
| Hosting | **Vercel** (unchanged) | Native Next.js, Fluid Compute for Server Actions, ISR on the edge, preview URLs per branch. |

---

## What we explicitly chose NOT to use

| Rejected | Why |
|---|---|
| `next-forge` | Multi-tenant SaaS template with auth/billing/analytics baked in. Wrong shape for a single-tenant watch shop; we'd spend more time deleting than building. |
| Pages Router | Server Components are the entire reason we're migrating. Pages Router can't do them. |
| Drizzle / Prisma ORM | We already use Supabase REST/RPC patterns. Adding an ORM means duplicating schema in TypeScript and re-implementing RLS at the app layer. Stay with `@supabase/ssr`. |
| Redux / Zustand / Jotai | Server Components + URL state + React's built-in `useState` cover everything. The current Vite site has zero global state — we're not introducing one. |
| Edge runtime by default | Fluid Compute (Node.js) is the recommended default on Vercel. Edge has compatibility limits (no Node APIs, smaller cold-start budget) that don't pay off here. |
| `middleware.ts` | Deprecated in Next 16; use `proxy.ts`. |
| `vercel.json` | Replaced by `vercel.ts` when we cut over (typed config, dynamic logic, env access). |

---

## Repository layout (target end-state, after phase 8)

```
watch-alley/
├── next/                      # The only deployed app
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── (storefront)/  # Public route group: homepage, /available, /sold, /journal, /watch/[slug]
│   │   │   ├── admin/         # Admin route group (auth-gated via proxy.ts)
│   │   │   └── api/           # Webhooks only — prefer Server Actions for everything else
│   │   ├── components/
│   │   │   ├── ui/            # shadcn primitives (Dialog, Sheet, Form, …)
│   │   │   ├── storefront/    # WatchCard, SoldCard, JournalEntry, Carousel, …
│   │   │   └── admin/         # AdminTable, InventoryForm, …
│   │   ├── lib/
│   │   │   ├── supabase/      # server.ts (Server Components/Actions), client.ts (Client Components), admin.ts (service-role only)
│   │   │   ├── inventory/     # Domain: normalizeRow, sortForDisplay, filters
│   │   │   ├── journal/       # Domain: normalizePost, renderMarkdown
│   │   │   ├── fx/            # PHP → USD helper (mid-market via exchangerate.host, 24h cached)
│   │   │   └── schema/        # Zod schemas (one per Server Action boundary)
│   │   ├── styles/
│   │   │   └── globals.css    # @theme tokens, base resets, font-face declarations
│   │   └── proxy.ts           # Auth gate for /admin/**
│   ├── public/                # Static assets (logo, hero video, fallback watches.json)
│   ├── tests/
│   │   ├── e2e/               # Playwright specs
│   │   └── unit/              # Vitest specs
│   ├── biome.json
│   ├── next.config.ts
│   ├── tailwind.config.ts     # Empty — tokens live in globals.css @theme
│   └── tsconfig.json
├── docs/
│   ├── architecture.md        # This file
│   ├── migration-plan.md      # Phase tracker
│   ├── inventory-schema.md
│   ├── SUPABASE_SETUP.md
│   ├── JOURNAL_CMS_ARCHITECTURE.md
│   └── migrations/            # Supabase SQL migrations (15 files at time of writing)
└── supabase/
    └── functions/             # Edge functions: inquiry-notify, invite-admin
```

**During the migration**, the current Vite files stay at the repo root and the
old `scripts/` and `public/` directories remain authoritative for production
until phase 8 cuts over.

---

## Design tokens — single source of truth

All visual tokens live in [next/src/styles/globals.css](../next/src/styles/globals.css)
inside a Tailwind v4 `@theme` block. The token names mirror the current Vite
site's CSS custom properties so anyone moving between the two codebases reads
the same vocabulary.

| Token | Value | Used for |
|---|---|---|
| `--color-navy-deep` | `#070b14` | Page background |
| `--color-navy` | `#0b1220` | Cards, surfaces |
| `--color-cream` | `#ece4d3` | Primary text |
| `--color-gold` | `#c9a24b` | Accents, hover, italic emphasis |
| `--font-serif` | `Petrona` | Headlines, watch names |
| `--font-body` | `Spectral` | Paragraphs, blurbs |
| `--font-mono` | `JetBrains Mono` | Eyebrows, labels, section numbers |

Plus `--color-cream-{80,60}`, `--color-gold-{30,20}` opacity variants.

---

## Server / Client component boundary

**Default to Server.** A component becomes a Client Component only if it needs:

1. Event handlers (`onClick`, `onSubmit` with client-side logic)
2. State or refs (`useState`, `useRef`)
3. Browser APIs (`window`, `localStorage`, IntersectionObserver)
4. Effects (`useEffect`)

If none of those apply, it stays a Server Component — even if it has props, even
if it renders inside a Client Component. Push the `'use client'` boundary as far
down the tree as possible.

For the storefront, that means:

- **Server**: page layouts, watch grids, journal lists, the hero, the trust band, the contact section
- **Client**: the arrivals carousel (scroll behavior), the watch detail modal (state), the inquiry form (state + validation feedback), the hamburger drawer

The FX helper that fills `<span data-price-php>` placeholders lives in a tiny
Client Component that hydrates on mount, not in a global script.

---

## Why this is worth doing

The current Vite site works, but every new page costs ~200 lines of duplicated
inline JS and CSS — see how [sold.html](../sold.html) and
[available.html](../available.html) replicate the same Supabase fetch + render
loop. The Next.js migration buys:

1. **Component reuse.** `WatchCard` is one file, used by 4+ pages.
2. **Server-rendered HTML.** Inventory is in the response, not fetched after paint. SEO + LCP both improve.
3. **No anon key in the browser.** The Supabase URL + anon key currently ship to every visitor; SSR keeps them server-side.
4. **Real validation.** Replace 23 regex `validate-*.mjs` scripts with Playwright + Vitest.
5. **Image pipeline for free.** `next/image` replaces `scripts/optimize-images.mjs` + `scripts/generate-og-images.mjs`.
6. **No more `generate-*-pages.mjs` postbuild.** ISR handles per-slug pages natively.
