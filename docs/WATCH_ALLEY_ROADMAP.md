# The Watch Alley Product Operating Roadmap

Last updated: 2026-04-28
Project path: this repository
Repo: `https://github.com/gerdguerrero/watch-alley`

This is the living operating document for The Watch Alley. Update this file every time we ship work, change direction, add backlog items, finish a phase, or learn something from users/buyers.

## Executive thesis

The Watch Alley should evolve from a premium static landing page into a trusted, curated watch commerce operating system for Filipino collectors.

The brand should prove three things quickly:

1. These watches are desirable.
2. This seller is trustworthy.
3. It is easy to inquire and buy.

Current site strength: visual desire and premium editorial identity.
Next system priority: trust, inquiry conversion, inventory operations, and buyer feedback loops.

## Product north star

Make The Watch Alley the trusted curated watch dealer for Filipino collectors: premium enough for serious enthusiasts, simple enough for casual buyers, and operationally strong enough to scale drops, inquiries, consignments, and community.

## Core metrics to track

- Visits
- Product views
- Inquiry clicks
- Viber joins
- Inquiry conversion rate
- Time to first reply
- Sell-through rate
- Average days to sell
- Gross margin per piece
- Most requested brands/models
- Lost inquiry reasons
- Waitlist signups
- Consignment submissions
- Social posts published per drop
- Facebook/Instagram post-to-inquiry conversion
- Inquiry-to-sale conversion by source: website, Facebook, Instagram, Viber, referral

## Current baseline

- Static Vite website with a premium editorial homepage and admin surface at `/admin`.
- Single large storefront `index.html`; admin behavior currently lives mainly in `scripts/admin.js` and should be modularized later, not during urgent client-facing fixes.
- Public/user-facing brand should be **The Watch Alley** everywhere except technical identifiers.
- Supabase is now the inventory source of truth. The homepage reads live published inventory from Supabase first, with `public/data/watches.json` retained only as a resilience fallback.
- Owner-facing admin copy no longer exposes terminal, Git, JSON regeneration, or deployment workflow; saved changes are framed as website updates that happen automatically.
- Homepage arrival cards render from the live inventory path instead of hardcoded watch-card HTML.
- Product detail modal opens from inventory-rendered cards and surfaces trust-critical listing fields.
- Each watch is individually addressable via `/#/watch/<slug>` deep links and exposes a Copy share link action.
- Sold listings render in a homepage Sold Archive section, filtered out of the active drop carousel, and surface a sold-state product modal.
- Supabase already holds inventory, structured inquiries, admin allowlist, and invite/auth workflow foundations; the next business-critical surfaces are public inquiry form, admin Inbox, canonical watch pages, and controlled social publishing.

## Operating rule

Every meaningful work session should update:

1. This roadmap checklist.
2. The progress log.
3. Any affected sprint/phase notes.
4. The backlog if new ideas or blockers appear.

## Phase 1: Conversion + Trust Foundation

Goal: turn the beautiful page into a serious sales funnel.

Status: In progress.

Checklist:

- [x] Create living roadmap/checklist document.
- [x] Create structured watch inventory data file.
- [x] Add inventory validation script and `pnpm test` command.
- [x] Add stable public watch image assets for inventory-driven rendering.
- [x] Generate homepage watch cards from inventory data instead of hardcoded HTML.
- [x] Add product detail modal or product detail pages.
- [x] Add stronger per-watch inquiry CTA.
- [x] Add availability states: Available, Reserved, Sold.
- [x] Add box/papers/service history fields visibly in the UI.
- [x] Add disclosure/condition notes visibly in the UI.
- [x] Add real Authenticity page.
- [x] Add real Terms page.
- [x] Add real Privacy page.
- [x] Add buying process section: Browse -> Inquire -> Confirm -> Ship/Meet.
- [x] Add event tracking for important clicks.
- [ ] Optimize images to WebP/AVIF and responsive sizes.
- [x] Add sitemap.xml.
- [x] Add robots.txt.
- [x] Add schema.org Product and LocalBusiness metadata.

Definition of done:

- A buyer can understand the watch, trust the listing, and inquire confidently within 1-2 clicks.
- Product/inventory updates no longer require editing large chunks of HTML.
- `pnpm test` and `pnpm build` pass.

## Phase 2: Inventory OS

Goal: make inventory maintainable and scalable.

Status: Backlog.

Checklist:

- [x] Decide source of truth: JSON, Supabase, Airtable, Google Sheets, or CMS. (Chosen: Supabase as source of truth; public storefront reads Supabase first, with `public/data/watches.json` as fallback only.)
- [x] Add inventory schema documentation. (`docs/inventory-schema.md`)
- [x] Add admin-friendly update workflow.
- [x] Add Sold Archive.
- [ ] Add product slugs.
- [ ] Add brand/category pages.
- [ ] Add search/filter for brand, price, condition, status.
- [x] Add image requirements checklist for each listing.
- [x] Add internal listing QA checklist before publish.
- [ ] Add low-stock/featured product flags.

Definition of done:

- New watch listings can be added consistently without touching page layout code.
- Sold watches become useful SEO and social proof assets.

## Phase 3: Lead CRM

Goal: capture buyer intent and make follow-up systematic.

Status: Backlog.

Checklist:

- [x] Track inquiry source and watch interest. (Public form attaches `watchId`/`watchSlug` and `source: 'website'` on every submission.)
- [x] Add inquiry status: New, Replied, Negotiating, Reserved, Sold, Lost. (Workflow: new → contacted → viewing → reserved → sold/lost/spam, enforced server-side.)
- [x] Add lead notes and follow-up date. (Status note + auto-stamped `responded_at`/`closed_at`.)
- [x] Build simple dashboard or Google Sheet/Supabase view. (Admin Inbox tab with totals, top inquired watches, status filter.)
- [ ] Add weekly report: top clicked watches, inquiries, conversion rate.
- [ ] Track lost reasons: price, condition, sold, no response, timing.
- [ ] Add reply templates for common inquiries.

Definition of done:

- Every serious buyer conversation can be tracked from first click to sale or loss.
- The team knows which watches and brands create demand.

## Phase 4: Community Growth

Goal: turn the Viber/IG audience into a repeatable demand engine.

Status: Backlog.

Checklist:

- [ ] Add waitlist form for specific brands/references.
- [ ] Add “notify me when similar piece arrives.”
- [ ] Add private drop signup.
- [ ] Add VIP/early-access segmentation.
- [ ] Add weekly Viber drop digest workflow.
- [ ] Add wishlist concept.
- [ ] Add buyer preference profile.

Definition of done:

- The Watch Alley can source inventory based on known buyer demand, not guesswork.

## Phase 5: Consignment + Sourcing Workflow

Goal: scale beyond owned inventory while staying curated.

Status: Backlog.

Checklist:

- [ ] Add “Sell or Consign Your Watch” page/form.
- [ ] Collect brand, model, reference, condition, box/papers, asking price, photos, location, contact.
- [ ] Add internal statuses: Submitted, Reviewing, Offer Sent, Accepted, Photo Scheduled, Listed, Sold, Paid Out.
- [ ] Add consignment agreement template.
- [ ] Add intake photo standards.
- [ ] Add valuation notes field.
- [ ] Add payout tracking.

Definition of done:

- The Watch Alley can accept supply without becoming an uncurated marketplace.

## Phase 6: Content + SEO Authority

Goal: turn expertise into organic traffic and trust.

Status: Backlog.

Checklist:

- [ ] Build Journal index.
- [ ] Add article template.
- [ ] Add SEO metadata per article.
- [ ] Publish condition grading guide.
- [ ] Publish authenticity guide.
- [ ] Publish buying pre-owned watches in Manila guide.
- [ ] Publish brand/reference guides for Seiko, Omega, Tissot, Hamilton.
- [ ] Publish market/resale observations.
- [ ] Connect sold archive to SEO pages.

Definition of done:

- The Watch Alley ranks for collector-intent searches and feels like an authority, not just a shop.

## Phase 7: Admin + Automation

Goal: make site operations fast enough for frequent drops while keeping the owner workflow non-technical.

Status: Backlog / staged.

Checklist:

- [x] Admin add/edit watch.
- [x] Admin upload/reorder photos. (Drag-and-drop or click upload to the `watches` Storage bucket; reorder via on-thumb controls; first photo becomes the primary cover.)
- [x] Admin mark as sold/reserved.
- [ ] Generate product page from listing.
- [ ] View inquiries in an admin Inbox.
- [ ] View top clicked watches.
- [ ] Export inventory.
- [x] Generate Facebook Page caption from listing. (Preview-only Phase A shipped in `/admin`; no Meta credentials required.)
- [x] Generate Instagram caption from listing. (Preview-only Phase A shipped in `/admin`; no Meta credentials required.)
- [ ] Generate Viber drop post from listing.
- [x] Add Social Publishing panel in `/admin` with preview/edit workflow.
- [ ] Add secure Meta connection through server-side/Supabase Edge Functions; no Facebook/Instagram passwords and no Meta tokens in browser code.
- [ ] Add explicit Post to Facebook and Post to Instagram buttons for published listings.
- [ ] Store social post status, published URLs, timestamps, errors, and retry history in Supabase.
- [ ] Prevent duplicate accidental reposts unless an admin explicitly confirms.
- [ ] Attribute inquiries back to social source where possible.

Definition of done:

- The owner can run drops without asking a developer to edit files.
- The owner can generate and approve social posts from a listing without copy/paste errors.
- Facebook/Instagram publishing is controlled, auditable, and secure; it never blindly posts every draft/save.

### Controlled Meta social publishing principle

The recommended workflow is **controlled publishing**, not blind auto-posting:

1. Save Draft.
2. Publish / Update Published Listing on the website.
3. Generate Facebook and Instagram post previews.
4. Let the owner edit captions and confirm.
5. Post to Facebook Page and/or Instagram Professional account.
6. Store the post URLs, timestamps, and errors in Supabase.

Plan: `docs/plans/2026-04-28-controlled-meta-social-publishing.md`.

## Later / not now

Avoid these until the inquiry funnel and inventory workflow are proven:

- Full ecommerce checkout.
- Native mobile app.
- Open marketplace.
- User accounts for everyone.
- Heavy rewrite purely for trend-chasing.
- Complex search/filter before inventory volume requires it.

## Backlog and open questions

- [ ] Should Viber remain the primary conversion channel, or should WhatsApp/Messenger also be supported?
- [ ] Should the site collect leads directly, or only deep-link to messaging apps for now?
- [ ] What are the exact authenticity and warranty claims The Watch Alley is comfortable making?
- [ ] Are current prices and watch specs final, or mock/demo data?
- [ ] Who maintains product photos and final copy?
- [ ] What is the preferred deployment host/domain workflow?
- [ ] What real contact number/email should replace placeholders?
- [ ] Should there be a sold archive immediately, or only once more watches have sold through the site?
- [ ] What are the Facebook Page URL/name and Instagram handle for The Watch Alley?
- [ ] Is the Instagram account Business/Creator and connected to the Facebook Page?
- [ ] Who owns/admins the Meta Business account and can grant app access?
- [x] Should social publishing start as preview-only drafts while Meta App Review is in progress? Answer: yes — Phase A starts with preview-only Facebook/Instagram captions in `/admin`, with no Meta credentials required.
- [ ] Should the default social CTA be DM, website inquiry form, Messenger, Viber, or a combination?

## Progress log

### 2026-04-28 16:30 PST (Social Publishing Phase A — persistent Supabase drafts)

- Added migration `0009-watch-alley-social-publishing-drafts.sql`: new `watch_alley.social_posts` table (one row per `watch_id` + `platform`) with RLS deny-all and three new admin RPCs (`admin_save_social_draft`, `admin_list_social_drafts_for_watch`, `admin_delete_social_draft`).
- All three RPCs are `SECURITY DEFINER`, `search_path = ''`, `is_admin()`-gated, `revoke ... from public, anon`, `grant execute ... to authenticated`. Same hardening posture as the existing watches/inquiries RPCs.
- Forward-compatible columns (`status`, `external_post_id`, `external_post_url`, `published_at`, `error_*`) are in place so Phase B can flip a draft to `published` without another schema migration. **No Meta tokens, app secrets, or page access tokens are ever stored** — those will live exclusively in Supabase Edge Function secrets when Phase B lands.
- Wired the admin Social Publishing panel: a "Save drafts to inventory" button persists the current Facebook + Instagram captions to Supabase via the new RPC, and selecting a watch auto-loads any saved drafts (with a "last updated" timestamp meta line). Captions still travel via `textarea.value`, never `innerHTML`, so the panel remains XSS-safe by construction.
- Added `scripts/validate-admin-social-drafts.mjs` to `pnpm test`. It pins: the migration's table/RLS/RPC contract, the new save-button + saved-drafts meta DOM ids, the lifecycle hooks (`loadIntoForm` calls `loadSocialDraftsForActiveWatch`, `hideForm` clears the saved-drafts meta), the credential-free admin JS, and the unsaved-listing guard inside `saveSocialDrafts`.

### 2026-04-28 16:00 PST (Social Publishing Phase A — preview-only MVP)

- Added an owner-friendly Social Publishing panel inside `/admin` inventory editing.
- The panel generates editable Facebook and Instagram captions from the selected listing: brand/model/name, reference, condition, inclusions, price, status, and public watch URL.
- Added copy buttons for both captions with clipboard support and a textarea fallback.
- Kept Phase A credential-free: no Facebook/Instagram passwords, no Meta tokens, no browser-side Meta posting, and no direct Meta calls.
- Added `scripts/validate-admin-social-preview.mjs` and wired it into `pnpm test` to guard the preview UX, The Watch Alley brand use, editable captions, copy fallback, and credential-free browser contract.

### 2026-04-28 (Phase 7 — admin photo upload to Supabase Storage)

- Replaced the text-only image path inputs in `/admin` with a real upload UI: file picker, drag-and-drop dropzone, and a thumbnail grid with reorder (◀ ▶) and remove controls. The first thumb is marked Primary.
- Files upload to the `watches` Storage bucket (already provisioned in `0005-watch-alley-storage.sql`, public-read, 10 MB cap, jpeg/png/webp/avif). Storage keys are namespaced as `${slug || 'unsorted'}/${timestamp}-${rand}-${cleanFilename}`.
- The legacy `Primary image path` and `All image paths` inputs are preserved behind a `Show raw paths (advanced)` disclosure. They stay in sync with the thumbnail grid in both directions, so `collectFormPayload()` and the `admin_upsert_watch` RPC contract are unchanged.
- The upload status line surfaces success and failure counts; failed uploads do not block successful ones.
- Added `scripts/validate-admin-image-upload.mjs` and wired it into `pnpm test`. All 8 validators + `pnpm build` pass clean.
- The owner can now publish a new watch end-to-end without a developer touching the file system.

### 2026-04-28 (Phase 3 — public inquiry form + admin Inbox)

- Replaced per-watch `mailto:` CTAs with a public inquiry modal on the storefront. The modal opens from any watch card and from the "Inquire About This Watch" / "Ask About Similar References" actions inside the product detail modal.
- Inquiries POST to the existing `public.submit_inquiry` RPC (anon-callable, RLS-hardened). Payload includes `watchId`, `watchSlug`, name, email, optional phone/channel, message, and `source: 'website'`. Returns a reference ID surfaced in the success panel.
- Anti-spam: honeypot field (`name="company"`, off-screen). The form silently drops bot submissions before any RPC call.
- Resilience fallback: an "Email us directly" link inside the modal carries the per-watch `mailto:` so the funnel keeps working if Supabase is unreachable.
- Added the Inbox tab to `/admin` and made it the default landing tab. It uses the existing `admin_list_inquiries`, `admin_update_inquiry_status`, and `admin_inquiry_metrics` RPCs (all admin-only, allowlist-checked server-side).
- Inbox surfaces a metrics strip (new / contacted / viewing / reserved / won / last 7 days), a status filter dropdown, an inquiry list with click-to-expand drawer, and a status transition control with an optional status note.
- Status transitions auto-stamp `responded_at` (on `contacted`) and `closed_at` (on `sold/lost/spam`), already enforced inside the RPC.
- Added `scripts/validate-inquiry-flow.mjs` and wired it into `pnpm test`. Existing `validate-product-detail-modal.mjs` and `validate-inventory-rendering.mjs` updated: the per-watch inquiry CTA escape contract now applies to `data-mailto-fallback` instead of `href` (the CTA is a `<button>` now, not an `<a>`).
- `pnpm test` (7 validators) and `pnpm build` both pass clean.
- Open follow-ups: (1) Edge Function notification (Resend or Viber webhook) on inquiry insert so the owner does not need to poll the Inbox tab; (2) Vercel BotID once spam volume warrants it; (3) reply templates in Phase 3 backlog.

### 2026-04-28 (Roadmap — controlled Meta social publishing decision)

- Added controlled Facebook Page + Instagram publishing as a recommended future automation path for The Watch Alley admin.
- Decision: do not auto-post on every Save. Generate social drafts/previews from published listings, require owner approval, then post through secure server-side Meta Graph API integration.
- Added implementation plan at `docs/plans/2026-04-28-controlled-meta-social-publishing.md`.
- Added roadmap checklist items for Meta account connection, post preview/edit/approve workflow, duplicate prevention, publish logs, retry errors, and source attribution.

### 2026-04-28 (Phase 2 — Inventory OS, source-of-truth migration)

- Created Supabase schema `watch_alley` with table `watches` (RLS enabled, public read policy, sold-status constraint, updated_at trigger).
- Seeded all 13 watches (10 active, 3 sold) into Supabase from `public/data/watches.json`.
- Added `public.watches` view (`security_invoker`) so PostgREST exposes the table without renaming the underlying schema.
- Added `scripts/sync-watches-from-supabase.mjs` and `pnpm sync:watches` script that pulls the live rows and overwrites `public/data/watches.json`.
- Added `.env.example` and `.env.local` (gitignored) wiring for `WATCH_ALLEY_SUPABASE_URL` / anon key / service-role key.
- Hardened the `watch_alley.set_updated_at` trigger function with a pinned `search_path` (Supabase advisor recommendation).
- Documented the schema, sync workflow, image conventions, listing QA checklist, and migration trade-offs in `docs/inventory-schema.md`.
- All 5 validators still pass against the regenerated JSON; `pnpm build` clean.
- Added admin update workflow at `/admin.html`: Supabase Auth (email + password) + server-side allowlist check (`watch_alley.admin_emails` + `watch_alley.is_admin()`) + `SECURITY DEFINER` RPCs (`public.admin_upsert_watch`, `public.admin_delete_watch`, `public.admin_mark_watch_sold`, `public.admin_whoami`). The page lists, filters, creates, edits, and deletes watches without ever holding a service-role key in the browser.
- `robots.txt` disallows `/admin` from crawlers; admin page sets `noindex,nofollow`.
- Discovered the Supabase project we migrated into was the wrong tenant (it already hosted an unrelated `relief_posts`/`applications` app). Dropped `watch_alley` schema, `public.watches` view, and all `admin_*` RPCs from that project — confirmed zero artifacts left. Replaced the hardcoded project URL + anon key with placeholders in `.env.local`, `scripts/admin.js`, and `.env.example`. Admin page now renders a "Connect a Supabase project" notice until reconfigured. Bundled the full schema + admin RPC bootstrap as `docs/migrations/0001-watch-alley-bootstrap.sql` so the new project (in the right org) can be set up with a single SQL paste.

### 2026-04-28 (Phase 1 — Conversion + Trust Foundation)

- Created living roadmap/checklist for The Watch Alley.
- Created Sprint 1 implementation plan under `docs/plans/`.
- Created local Second Brain project note pointing back to this roadmap.
- Established Phase 1 as Conversion + Trust Foundation.
- Added structured inventory source of truth at `public/data/watches.json`.
- Added stable public inventory image assets under `public/watch-assets/`.
- Added validation script at `scripts/validate-watch-data.mjs`.
- Added `pnpm test` script to validate watch data.
- Verified inventory validation passes for 10 watches.
- Verified production build passes with `pnpm build`.
- Opened PR #1: `https://github.com/gerdguerrero/watch-alley/pull/1`.
- Confirmed Vercel checks are passing on PR #1.
- Rendered homepage arrivals carousel from `public/data/watches.json` instead of hardcoded watch-card HTML.
- Added `scripts/validate-inventory-rendering.mjs` and expanded `pnpm test` to validate the data-driven rendering contract.
- Hardened generated inquiry links with safe email validation and escaped `mailto:` href interpolation after independent review.
- Verified browser preview loads 10 data-driven cards and per-watch mailto inquiry links.
- Verified `pnpm test` and `pnpm build` pass.
- Added product detail modal with inventory-driven gallery, specs, availability, disclosure, price, and per-watch inquiry CTA.
- Added `scripts/validate-product-detail-modal.mjs` and expanded `pnpm test` to protect the modal rendering contract.
- Verified modal opening, content population, inquiry CTA, and Escape close behavior in browser preview.
- Added shareable watch deep links: `/#/watch/<slug>` opens the matching product detail modal automatically.
- Added Copy share link action inside the modal with clipboard API + textarea fallback and an aria-live status.
- Wired `history.pushState`/`replaceState`, `popstate`, and `hashchange` so browser back/forward correctly toggles the modal and preserves scroll position.
- Added `scripts/validate-shareable-watch-urls.mjs` and expanded `pnpm test` to protect the deep-link contract.
- Browser-verified deep link, back/forward, card click URL update, copy link, and graceful no-op on unknown slugs.
- Started Phase 2 Inventory OS with a Sold Archive starter: filtered active drop carousel to non-sold watches, added homepage `#sold-archive` section, sold-state product modal branch with Ask About Similar References CTA, and `scripts/validate-sold-archive.mjs`.
- Extended `scripts/validate-watch-data.mjs` so sold listings must include `soldAt` (YYYY-MM) and `soldPrice` (non-negative integer in PHP); updated success log to report sold count.
- Browser-verified Sold Archive renders 3 sample sold cards, deep linking to a sold slug auto-opens the sold-state modal, and the active carousel still renders 10 active watches.

## Commands

Use these for routine verification:

```bash
pnpm test
pnpm build
```

Use this for local preview:

```bash
pnpm dev
```
