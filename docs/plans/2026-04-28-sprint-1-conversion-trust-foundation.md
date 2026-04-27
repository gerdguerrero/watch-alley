# Watch Alley Sprint 1 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Convert Watch Alley from a premium static landing page into a maintainable trust-and-inquiry funnel.

**Architecture:** Keep the current Vite/static foundation for now. Introduce structured inventory data first, then progressively render listing UI from that data and add trust/conversion surfaces. Avoid a heavy rewrite until the funnel and data model are proven.

**Tech Stack:** Vite, HTML/CSS/vanilla JavaScript, JSON inventory data, Node validation scripts.

---

## Task 1: Create living roadmap and progress tracker

**Objective:** Create a durable document for phases, checklists, backlog, decisions, and progress logs.

**Files:**
- Create: `docs/WATCH_ALLEY_ROADMAP.md`

**Verification:**
- Roadmap exists.
- Roadmap has phases, checklist, backlog, progress log, and commands.

**Status:** Done on 2026-04-28.

---

## Task 2: Add validated inventory data source

**Objective:** Create the first source of truth for watches so future UI, SEO, inquiry, and admin work can build from data instead of hardcoded cards.

**Files:**
- Create: `public/data/watches.json`
- Create: `public/watch-assets/`
- Create: `scripts/validate-watch-data.mjs`
- Modify: `package.json`

**Test-first cycle:**

1. Add `scripts/validate-watch-data.mjs`.
2. Add `pnpm test` command.
3. Run `pnpm test` and confirm it fails because `public/data/watches.json` is missing.
4. Add `public/data/watches.json`.
5. Add stable public image assets under `public/watch-assets/` so future JSON-rendered cards use production-resolvable image URLs.
6. Run `pnpm test` and confirm it passes.

**Verification:**

```bash
pnpm test
```

Expected:

```text
Watch inventory valid: 10 watches (10 available).
```

**Status:** Done on 2026-04-28.

---

## Task 3: Render watch cards from inventory data

**Objective:** Replace hardcoded watch cards in `index.html` with JavaScript-rendered cards from `public/data/watches.json`.

**Files:**
- Modify: `index.html`
- Create: `scripts/validate-inventory-rendering.mjs`
- Modify: `package.json`
- Modify: `scripts/validate-watch-data.mjs` if schema gaps appear

**Steps:**

1. Add a small loading/error state inside `#carousel-track`.
2. Add a `formatPrice(price, currency)` helper.
3. Fetch `/data/watches.json` on page load.
4. Render the existing watch-card markup from each watch object.
5. Preserve current visual design and carousel behavior.
6. Ensure inquiry links use `inquirySubject` and `inquiryBody`.
7. Keep the no-JS fallback if feasible, or add a clear fallback message.
8. Run `pnpm test`.
9. Run `pnpm build`.
10. Manually preview homepage and verify all 10 cards appear.

**Verification completed on 2026-04-28:**

```bash
pnpm test
pnpm build
```

Manual preview confirmed 10 cards render from `/data/watches.json`, with MoonSwatch first, Fast & Furious Fire Boost last, and per-watch `mailto:` inquiry links populated from inventory copy. Independent review caught an href-attribute hardening gap; the final implementation escapes generated `mailto:` hrefs and validates `inquiryEmail` with a conservative whitelist.

**Status:** Done on 2026-04-28.

---

## Task 4: Add product detail modal

**Objective:** Let buyers inspect trust-critical listing details without leaving the page.

**Files:**
- Modify: `index.html`
- Create: `scripts/validate-product-detail-modal.mjs`
- Modify: `package.json`
- Modify: `docs/WATCH_ALLEY_ROADMAP.md`
- Create: `docs/plans/2026-04-28-product-detail-modal.md`

**Steps:**

1. Add modal markup near the bottom of `body`.
2. Add CSS for modal, backdrop, gallery image, detail rows, disclosure block, and CTA.
3. Add JS to open modal from a watch card.
4. Populate modal from watch inventory data.
5. Add close button, Escape handling, and backdrop click handling.
6. Trap/restore focus enough for accessibility.
7. Add tests/validation if modal data requirements expand.
8. Run `pnpm test` and `pnpm build`.
9. Preview desktop and mobile.

**Verification completed on 2026-04-28:**

```bash
pnpm test
pnpm build
```

Browser preview confirmed the modal opens from an inventory-rendered card, displays the selected watch's gallery/specs/condition/disclosure/availability/price, uses a per-watch escaped inquiry `mailto:` CTA, and closes with Escape.

**Status:** Done on 2026-04-28.

---

## Task 5: Add trust pages and footer links

**Objective:** Replace placeholder footer links with real trust content.

**Files:**
- Create or implement anchors/pages for: Authenticity, Privacy, Terms
- Modify: `index.html`

**Steps:**

1. Decide whether these are sections in the single page or standalone HTML files.
2. Add Authenticity content first because it directly affects buyer trust.
3. Add Privacy and Terms starter pages.
4. Replace `#` footer links.
5. Run link check manually or with a script.
6. Run `pnpm build`.

**Status:** Pending.

---

## Task 6: Add analytics events

**Objective:** Track conversion behavior without overbuilding.

**Files:**
- Modify: `index.html`

**Events to track:**
- `shop_available_click`
- `watch_inquiry_click`
- `viber_join_click`
- `email_click`
- `instagram_click`
- `product_detail_open`

**Status:** Pending.

---

## Task 7: Optimize images

**Objective:** Improve mobile performance while preserving premium visuals.

**Files:**
- Add optimized assets under `assets/optimized/` or replace existing assets after backup.
- Modify image references in `index.html` and/or data.

**Steps:**

1. Generate WebP/AVIF variants.
2. Generate responsive sizes.
3. Update image references.
4. Verify visual quality.
5. Run `pnpm build`.

**Status:** Pending.
