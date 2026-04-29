# The Watch Alley

> A curated watch commerce platform for Filipino collectors — premium editorial identity, operator-friendly CMS, and a Supabase-powered inventory operating system.

---

## Executive Summary

The Watch Alley is a full-stack digital commerce platform built for a single boutique watch dealer in the Philippines. It combines a hand-crafted editorial storefront with a private content management system that lets a non-technical operator manage inventory, publish journal articles, handle buyer inquiries, and prepare social content — without any terminal or deployment workflow.

**The three product promises it must deliver:**

1. These watches are desirable.
2. This seller is trustworthy.
3. It is easy to inquire and buy.

The system is intentionally lean: no JavaScript framework overhead on the public site, no third-party CMS, no separate backend server. Supabase handles auth, data, file storage, and serverless functions. Vite handles the build. Vercel handles delivery.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | Vanilla HTML/CSS/JS | Zero bundle overhead; full control over every pixel; no framework churn |
| **Build tool** | Vite 8 | Fast HMR in dev, hash-fingerprinted assets in prod, multi-page rollup |
| **Package manager** | pnpm 10 | Deterministic lockfile, fast installs |
| **Backend / Database** | Supabase (PostgreSQL 15) | Auth, RLS, SECURITY DEFINER RPCs, Storage, Edge Functions — one platform |
| **Image processing** | Sharp (Node.js) | WebP/AVIF conversion, OG card generation, responsive srcset variants |
| **Deployment** | Vercel | Clean URLs, zero-config CDN, instant preview deployments |
| **Fonts** | Google Fonts (Petrona, Spectral, JetBrains Mono) | Loaded via `<link preconnect>`; no self-hosting needed |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel CDN                           │
│                                                             │
│  /                → dist/index.html        (storefront)     │
│  /admin           → dist/admin/index.html  (private CMS)    │
│  /journal         → dist/journal.html      (article index)  │
│  /journal/<slug>  → dist/journal/<slug>/   (article pages)  │
│  /watch/<slug>    → dist/watch/<slug>/     (SEO watch pages) │
│  /og/<slug>.jpg   → dist/og/               (OG share cards) │
│  /authenticity    → dist/authenticity.html                  │
│  /terms           → dist/terms.html                         │
│  /privacy         → dist/privacy.html                       │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP / PostgREST / RPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                        │
│                                                             │
│  PostgreSQL (schema: watch_alley)                           │
│  ├── watches           inventory + publish state            │
│  ├── inquiries         buyer pipeline + status workflow     │
│  ├── admin_emails      allowlist (not exposed via API)      │
│  ├── journal_posts     CMS content (markdown)               │
│  └── social_drafts     prepared social captions             │
│                                                             │
│  Auth                  email/password + session tokens      │
│  Storage               watch-images/, journal-images/       │
│  Edge Functions        inquiry-notify, invite-admin         │
│  RPC (SECURITY DEFINER) admin write gates                   │
└─────────────────────────────────────────────────────────────┘
```

### Data flow — public storefront

```
Browser arrives at /
       │
       ▼
index.html loads inline JS
       │
       ├─► GET /rest/v1/watches (Supabase PostgREST, anon key)
       │         └── public.watches view  ← RLS: published=true
       │
       ├─► On success  → render carousel from live data
       └─► On failure  → render from /data/watches.json (static fallback)
```

### Data flow — admin CMS

```
Admin arrives at /admin
       │
       ▼
admin_whoami() RPC  ← anon-callable
       │
       ├─► { is_admin: false } → render Forbidden panel
       └─► { is_admin: true }  → render workspace
                │
                ├── Reads via admin_list_watches() (SECURITY DEFINER, sees drafts)
                ├── Writes via admin_upsert_watch() / admin_delete_watch()
                ├── Inquiry pipeline via admin_list_inquiries() / admin_update_inquiry_status()
                ├── Journal via admin_upsert_journal_post() / admin_list_journal_posts()
                └── Dashboard via admin_dashboard_metrics()
```

### Build pipeline

```
pnpm build
    │
    ├─ [prebuild]   node scripts/generate-og-images.mjs
    │                     └── public/og/<slug>.jpg  (1200×630, per watch)
    │
    ├─ [build]      vite build
    │                     └── dist/  (fingerprinted assets, all static HTML pages)
    │
    └─ [postbuild]  node scripts/generate-journal-pages.mjs
                    node scripts/generate-watch-pages.mjs
                          ├── dist/journal/<slug>/index.html  (fetched from Supabase)
                          ├── dist/journal/_manifest.json
                          ├── dist/watch/<slug>/index.html    (OG meta + JSON-LD)
                          └── dist/sitemap.xml                (updated)
```

---

## Project Structure

```
watch-alley/
│
├── index.html                  # Storefront (single large page, inline JS)
├── admin/
│   └── index.html              # Admin CMS (private, auth-gated)
├── journal.html                # Journal index page
├── authenticity.html           # Trust / authenticity policy
├── terms.html                  # Terms of service
├── privacy.html                # Privacy policy
│
├── scripts/
│   ├── admin.js                # All admin UI logic (~1900 lines)
│   ├── generate-og-images.mjs  # Prebuild: 1200×630 OG card generator
│   ├── generate-watch-pages.mjs # Postbuild: per-watch SEO pages + sitemap
│   ├── generate-journal-pages.mjs # Postbuild: Supabase → static journal HTML
│   ├── optimize-images.mjs     # Offline: PNG → WebP/AVIF + responsive variants
│   ├── seed-watches-to-supabase.mjs  # One-time: JSON → Supabase seed
│   ├── sync-watches-from-supabase.mjs # On-demand: refresh static JSON fallback
│   ├── lib/
│   │   └── markdown.mjs        # Tiny escape-safe markdown renderer (journal)
│   └── validate-*.mjs          # 20 contract validators (pnpm test)
│
├── styles/
│   ├── admin.css               # Admin-only styles
│   └── trust-page.css          # Shared trust/legal page styles
│
├── public/
│   ├── data/watches.json       # Static inventory fallback snapshot
│   ├── og/                     # Generated OG share-card images (1200×630 JPG)
│   ├── watch-assets/           # Watch photography (PNG + WebP variants)
│   ├── robots.txt
│   └── sitemap.xml             # Base sitemap (postbuild writes the final version)
│
├── supabase/
│   └── functions/
│       ├── inquiry-notify/     # Edge Function: Viber/email notification on new inquiry
│       └── invite-admin/       # Edge Function: Supabase Auth invite email
│
├── docs/
│   ├── inventory-schema.md     # Full watch table column reference
│   ├── SUPABASE_SETUP.md       # Bootstrap guide for a new Supabase project
│   ├── WATCH_ALLEY_ROADMAP.md  # Living product operating roadmap
│   └── migrations/             # 15 numbered SQL migrations (apply in order)
│
├── types/
│   └── supabase.ts             # Generated Supabase TypeScript types
│
├── vite.config.js              # Multi-page build + /admin clean-URL middleware
├── vercel.json                 # cleanUrls: true, trailingSlash: false
└── package.json                # Scripts: dev, build, test, sync:watches, seed:watches
```

---

## Database Schema

All tables live in the `watch_alley` Postgres schema. A `public.watches` view exposes the same rows to PostgREST (so the JS client can query `/rest/v1/watches`). Row-Level Security is enabled on every table.

### Core tables

| Table | Purpose |
|---|---|
| `watches` | Primary inventory. One row per listing. |
| `inquiries` | Buyer contact pipeline with status workflow. |
| `admin_emails` | Auth allowlist. Not readable via PostgREST. |
| `journal_posts` | CMS content written in Markdown. |
| `social_drafts` | Prepared Facebook/Instagram captions per watch. |

### `watches` key columns

| Column | Type | Notes |
|---|---|---|
| `id` | `text PK` | Stable identifier, prefix `twa-` |
| `slug` | `text UNIQUE` | URL-safe kebab-case for `/watch/<slug>` |
| `status` | `text` | `available` / `reserved` / `sold` |
| `published` | `bool` | `false` = draft (hidden from storefront) |
| `featured` | `bool` | Eligible for hero featured card |
| `price` | `int` | Philippine Peso, integer |
| `images` | `text[]` | Ordered list of paths under `/watch-assets/` |
| `sold_at` | `text` | `YYYY-MM`, required when `status = 'sold'` |
| `sold_price` | `int` | Required when `status = 'sold'` |

### Migration history

| # | File | What it does |
|---|---|---|
| 0001 | `watch-alley-bootstrap.sql` | Schema, watches table, RLS, `public.watches` view |
| 0002 | `watch-alley-seed.sql` | Initial 13-watch inventory seed |
| 0003 | `watch-alley-admin-rpc-hardening.sql` | Revoke anon EXECUTE on write RPCs |
| 0004 | `watch-alley-inquiries-pipeline.sql` | Inquiries table + status workflow RPCs |
| 0005 | `watch-alley-storage.sql` | Storage buckets + upload policies |
| 0006 | `watch-alley-id-prefix-twa.sql` | Rename legacy `wa-` IDs to `twa-` prefix |
| 0007 | `watch-alley-admin-allowlist-rpcs.sql` | `admin_emails` management RPCs |
| 0008 | `watch-alley-revoke-anon-admin-inquiry-rpcs.sql` | Additional anon revokes |
| 0009 | `watch-alley-social-publishing-drafts.sql` | `social_drafts` table |
| 0010 | `watch-alley-provenance.sql` | Provenance fields on watches |
| 0011 | `watch-alley-inquiry-notifications.sql` | Edge Function trigger wiring |
| 0012 | `watch-alley-inquiry-lost-reason.sql` | `lost_reason` column on inquiries |
| 0013 | `watch-alley-journal.sql` | `journal_posts` table + admin RPCs + `journal-images` bucket |
| 0014 | `watch-alley-published-state.sql` | `published` column + `admin_list_watches` RPC |
| 0015 | `watch-alley-admin-dashboard.sql` | `admin_dashboard_metrics()` RPC |

### RPC reference (public schema, SECURITY DEFINER)

| RPC | Callable by | Purpose |
|---|---|---|
| `admin_whoami()` | anon + authed | Returns `{ email, is_admin }` for UI gating |
| `admin_upsert_watch(payload)` | authed admin | Insert or update a watch row |
| `admin_delete_watch(id)` | authed admin | Hard delete |
| `admin_mark_watch_sold(id, sold_at, sold_price)` | authed admin | Atomic sold transition |
| `admin_list_watches()` | authed admin | Returns all watches including drafts |
| `admin_list_inquiries(status, limit, offset)` | authed admin | Paginated inquiry list |
| `admin_update_inquiry_status(id, status, note)` | authed admin | Move inquiry through workflow |
| `admin_inquiry_metrics()` | authed admin | Totals + per-watch counts over 90 days |
| `admin_dashboard_metrics()` | authed admin | KPIs: inventory, inquiry funnel, lost reasons, activity feed |
| `admin_upsert_journal_post(payload)` | authed admin | Create or update a journal article |
| `admin_list_journal_posts()` | authed admin | Returns all posts (draft + published) |
| `admin_delete_journal_post(id)` | authed admin | Hard delete |
| `submit_inquiry(payload)` | anon | Buyer-facing inquiry submission |

---

## Security Model

- **No direct table writes from the browser.** All mutations go through `SECURITY DEFINER` RPCs. The admin can never write to a table that wasn't explicitly exposed via an RPC.
- **Admin allowlist.** `watch_alley.admin_emails` is invisible to PostgREST. The `is_admin()` function does a server-side check and is called by every admin RPC before any operation proceeds.
- **RLS on all tables.** Public reads are limited to the `public.watches` view which filters `published = true`. The `admin_emails` table has an explicit deny-all public read policy.
- **Anon revokes.** Write RPCs (upsert, delete, sold transition, inquiry mutations) have `REVOKE EXECUTE ON FUNCTION ... FROM anon` applied.
- **Edge Functions.** Sensitive operations (sending notifications, issuing auth invites) are handled in Supabase Edge Functions. Meta API tokens and SMTP credentials never enter browser code.
- **Draft listings.** `published = false` watches are invisible to the public storefront. The build pipeline fetches them using the service role key (server-side only, never exposed to the browser) to generate noindex preview pages for the operator's review.

---

## Design System

The visual language is **heritage craft / atelier** — warm dark tones, tactile surfaces, editorial restraint.

### Color tokens

| Token | Value | Use |
|---|---|---|
| `--walnut-deep` | `oklch(0.13 0.012 55)` | Page background |
| `--walnut` | `oklch(0.17 0.015 55)` | Card surfaces |
| `--paper` | `oklch(0.92 0.018 80)` | Admin panels, callouts |
| `--cream` | `#ece4d3` | Primary text |
| `--gold` | `#c9a24b` | Accents, CTAs, borders |
| `--gold-amber` | `oklch(0.78 0.13 75)` | Hover states |
| `--alert` | `oklch(0.55 0.14 25)` | Destructive / warning |

### Typography

| Role | Font | Size |
|---|---|---|
| Display / Hero | Petrona, serif | `clamp(36px, 7.5vw, 88px)` |
| Headline | Petrona, serif | `clamp(28px, 4vw, 48px)` |
| Body | Spectral, serif | `15px / 1.65` |
| Labels / mono | JetBrains Mono | `10px / 0.22em tracking` |

### Design principles

1. **Restraint outsells flash.** Empty space is a feature.
2. **Photography does the heavy lifting.** Layout and type get out of the way.
3. **Every detail signals trust.** Honest disclosure, full-resolution photos, named provenance.
4. **Mobile is the primary canvas.** Test at 375px first.
5. **Heritage means warmth, not antiques.** Modern performance, warm tones.

---

## Admin CMS Capabilities

The operator (non-technical client) manages everything through `/admin`:

| Tab | What it does |
|---|---|
| **Dashboard** | KPI tiles: active listings, total inquiries, response rate, conversion %, inquiry funnel, lost-reason breakdown, 7-day activity feed |
| **Inbox** | Buyer inquiry pipeline — view, reply, advance status (new → contacted → viewing → reserved → sold / lost), record lost reason |
| **Inventory** | Add, edit, delete watch listings; upload images; toggle published/draft; mark sold with realized price; reorder display priority |
| **Journal** | Write and publish journal articles in Markdown with a Word-style toolbar and live preview pane; upload inline images |
| **Admins** | Invite new admin accounts via Supabase Auth email |
| **Account** | Change password |

The admin never interacts with SQL, the terminal, or any deployment process. Saving a listing updates Supabase; the storefront reads it immediately.

---

## Image Pipeline

### Watch photography

Source files live in `public/watch-assets/`. Running `pnpm optimize:images` generates responsive WebP variants:

```
photo.png            → original (img fallback)
photo-1600.webp      → 1600px wide (desktop hero)
photo-800.webp       → 800px wide (card / mobile)
```

The storefront uses `<picture>` + `srcset` to serve the best format per device.

### OG share cards

Generated during `pnpm build` (prebuild step) by `scripts/generate-og-images.mjs`:

- **Output:** `public/og/<slug>.jpg` (1200×630 JPG)
- **Used in:**
  1. Per-watch SEO pages — `<meta property="og:image">`, `<meta name="twitter:image">`, Schema.org JSON-LD
  2. Product detail modal — "How this listing previews when shared" accordion with thumbnail and direct link

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- A Supabase project (free tier works)

### Local development

```bash
# Install dependencies
pnpm install

# Start dev server (hot reload, /admin clean URL middleware included)
pnpm dev
```

### Connecting to Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run each migration in `docs/migrations/` in numeric order.
3. Insert your admin email:
   ```sql
   insert into watch_alley.admin_emails (email, note)
   values ('you@example.com', 'Owner');
   ```
4. Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` constants near the top of `scripts/admin.js` and `index.html`.
5. Sign up at `/admin`, then sign in.

### Build and deploy

```bash
# Run all 20 contract validators
pnpm test

# Full production build (prebuild → vite → postbuild)
pnpm build

# Preview the built output locally
pnpm preview
```

Deployment is handled by Vercel on every push to `master`. `vercel.json` enables clean URLs.

### Utility scripts

```bash
# Refresh the static JSON fallback from live Supabase data
pnpm sync:watches

# Seed Supabase from public/data/watches.json (one-time bootstrap)
pnpm seed:watches

# Regenerate WebP/AVIF variants for all watch photos
pnpm optimize:images
```

---

## Contract Validators (`pnpm test`)

The project ships 20 lightweight Node.js validators that assert structural contracts without a test framework or browser:

| Validator | What it checks |
|---|---|
| `validate-watch-data` | JSON inventory shape + required fields |
| `validate-inventory-rendering` | Storefront carousel render path |
| `validate-product-detail-modal` | Modal field coverage + OG share preview |
| `validate-shareable-watch-urls` | `/#/watch/<slug>` deep-link wiring |
| `validate-sold-archive` | Sold section render + required sold fields |
| `validate-admin-layout` | Admin tab structure + default tab |
| `validate-admin-social-preview` | Social preview panel + caption counters |
| `validate-admin-social-drafts` | Draft save/load contract |
| `validate-admin-social-mockups` | Preview-summary panel DOM contract |
| `validate-inquiry-flow` | Buyer inquiry form + submit path |
| `validate-admin-image-upload` | Image upload UI + bucket path |
| `validate-image-pipeline` | WebP srcset wiring |
| `validate-provenance` | Provenance fields in modal |
| `validate-watch-pages` | Per-watch page generation + OG meta |
| `validate-inquiry-notify` | Edge Function wiring for notifications |
| `validate-lost-reason` | Lost reason capture in inquiry workflow |
| `validate-journal-editor` | Journal tab toolbar + live preview |
| `validate-watch-publish-state` | Draft/published toggle + DRAFT pill |
| `validate-admin-dashboard` | Dashboard KPI tiles + metrics RPC |
| `validate-curator-note` | Curator's Note section + data-driven hero |

All 20 must pass before committing. Run individually with `node scripts/validate-<name>.mjs`.

---

## Roadmap

See [`docs/WATCH_ALLEY_ROADMAP.md`](docs/WATCH_ALLEY_ROADMAP.md) for the full living roadmap. Current priorities:

- **Schedule-publish** — `publish_at` timestamp column + pg_cron for Friday drop workflow
- **Per-watch view tracking** — `view_event` log feeding dashboard analytics
- **Social publishing** — Supabase Edge Functions calling Meta Graph API for FB/IG posts
- **Mobile polish pass** — accessibility audit + 375px refinements
- **Real map embed** — replace SVG contact map placeholder with Mapbox

---

## Deployment

| Environment | URL | Branch |
|---|---|---|
| Production | https://watchalley.ph | `master` |
| Preview | Vercel preview URL | PRs / branches |

Vercel is configured with `cleanUrls: true` so `/admin`, `/journal`, and `/watch/<slug>` all resolve without trailing slashes or `.html` extensions.

---

## License

Private repository. All rights reserved — The Watch Alley / Gerd Guerrero.
