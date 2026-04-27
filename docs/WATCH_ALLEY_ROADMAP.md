# Watch Alley Product Operating Roadmap

Last updated: 2026-04-28
Project path: this repository
Repo: `https://github.com/gerdguerrero/watch-alley`

This is the living operating document for Watch Alley. Update this file every time we ship work, change direction, add backlog items, finish a phase, or learn something from users/buyers.

## Executive thesis

Watch Alley should evolve from a premium static landing page into a trusted, curated watch commerce operating system for Filipino collectors.

The brand should prove three things quickly:

1. These watches are desirable.
2. This seller is trustworthy.
3. It is easy to inquire and buy.

Current site strength: visual desire and premium editorial identity.
Next system priority: trust, inquiry conversion, inventory operations, and buyer feedback loops.

## Product north star

Make Watch Alley the trusted curated watch dealer for Filipino collectors: premium enough for serious enthusiasts, simple enough for casual buyers, and operationally strong enough to scale drops, inquiries, consignments, and community.

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

## Current baseline

- Static Vite website.
- Single large `index.html`.
- Premium editorial homepage already implemented.
- 10 watch cards shown on the homepage.
- Viber, Instagram, email, and appointment concepts already present.
- Build passes with `pnpm build`.
- Inventory is now documented in `public/data/watches.json` and validated with `pnpm test`.
- Inventory images use stable public URLs under `/watch-assets/` for future data-driven rendering.
- Homepage arrival cards now render from the inventory data source instead of hardcoded watch-card HTML.
- Product detail modal now opens from inventory-rendered cards and surfaces trust-critical listing fields.
- Each watch is now individually addressable via `/#/watch/<slug>` deep links and exposes a Copy share link action.

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
- [ ] Add box/papers/service history fields visibly in the UI.
- [x] Add disclosure/condition notes visibly in the UI.
- [ ] Add real Authenticity page.
- [ ] Add real Terms page.
- [ ] Add real Privacy page.
- [ ] Add buying process section: Browse -> Inquire -> Confirm -> Ship/Meet.
- [ ] Add event tracking for important clicks.
- [ ] Optimize images to WebP/AVIF and responsive sizes.
- [ ] Add sitemap.xml.
- [ ] Add robots.txt.
- [ ] Add schema.org Product and LocalBusiness metadata.

Definition of done:

- A buyer can understand the watch, trust the listing, and inquire confidently within 1-2 clicks.
- Product/inventory updates no longer require editing large chunks of HTML.
- `pnpm test` and `pnpm build` pass.

## Phase 2: Inventory OS

Goal: make inventory maintainable and scalable.

Status: Backlog.

Checklist:

- [ ] Decide source of truth: JSON, Supabase, Airtable, Google Sheets, or CMS.
- [ ] Add inventory schema documentation.
- [ ] Add admin-friendly update workflow.
- [ ] Add Sold Archive.
- [ ] Add product slugs.
- [ ] Add brand/category pages.
- [ ] Add search/filter for brand, price, condition, status.
- [ ] Add image requirements checklist for each listing.
- [ ] Add internal listing QA checklist before publish.
- [ ] Add low-stock/featured product flags.

Definition of done:

- New watch listings can be added consistently without touching page layout code.
- Sold watches become useful SEO and social proof assets.

## Phase 3: Lead CRM

Goal: capture buyer intent and make follow-up systematic.

Status: Backlog.

Checklist:

- [ ] Track inquiry source and watch interest.
- [ ] Add inquiry status: New, Replied, Negotiating, Reserved, Sold, Lost.
- [ ] Add lead notes and follow-up date.
- [ ] Build simple dashboard or Google Sheet/Supabase view.
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

- Watch Alley can source inventory based on known buyer demand, not guesswork.

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

- Watch Alley can accept supply without becoming an uncurated marketplace.

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

- Watch Alley ranks for collector-intent searches and feels like an authority, not just a shop.

## Phase 7: Admin + Automation

Goal: make site operations fast enough for frequent drops.

Status: Backlog.

Checklist:

- [ ] Admin add/edit watch.
- [ ] Admin upload/reorder photos.
- [ ] Admin mark as sold/reserved.
- [ ] Generate IG caption from listing.
- [ ] Generate Viber drop post from listing.
- [ ] Generate product page from listing.
- [ ] View inquiries.
- [ ] View top clicked watches.
- [ ] Export inventory.

Definition of done:

- The owner can run drops without asking a developer to edit files.

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
- [ ] What are the exact authenticity and warranty claims Watch Alley is comfortable making?
- [ ] Are current prices and watch specs final, or mock/demo data?
- [ ] Who maintains product photos and final copy?
- [ ] What is the preferred deployment host/domain workflow?
- [ ] What real contact number/email should replace placeholders?
- [ ] Should there be a sold archive immediately, or only once more watches have sold through the site?

## Progress log

### 2026-04-28

- Created living roadmap/checklist for Watch Alley.
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
