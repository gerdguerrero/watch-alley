# Watch Alley Product Detail Modal Implementation Plan

> **For Hermes:** Use subagent-driven-development skill when splitting this into multiple independent tasks. This phase is compact enough to implement in one branch, with TDD validation and independent review before PR.

**Goal:** Add a buyer-ready product detail modal so every inventory card can reveal trust-critical listing details and a stronger per-watch inquiry CTA without leaving the homepage.

**Architecture:** Keep Watch Alley as a static Vite page with vanilla JavaScript. Reuse `public/data/watches.json` as the source of truth, render modal content from the selected watch object, and keep all dynamic HTML escaped. Add a dedicated rendering-contract validator so future inventory/UI changes cannot silently break the modal.

**Tech Stack:** Vite, HTML/CSS/vanilla JavaScript, JSON inventory data, Node validation scripts.

---

## Task 1: Add failing modal rendering contract validator

**Objective:** Define the modal behavior before implementation.

**Files:**
- Create: `scripts/validate-product-detail-modal.mjs`
- Modify: `package.json`

**TDD cycle:**
1. Add validator assertions for modal markup, modal functions, data-driven rendering, safe inquiry links, and close interactions.
2. Add the validator to `pnpm test`.
3. Run `pnpm test` and confirm it fails because the modal does not exist yet.

**Acceptance criteria:**
- Validator checks for `#product-detail-modal` with dialog semantics.
- Validator checks for `renderProductDetailModal()`, `openProductDetailModal()`, and `closeProductDetailModal()`.
- Validator checks the modal renders reference, condition, set, material, movement, case size, edition, disclosure, image gallery, status, price, and inquiry CTA from inventory data.
- Validator checks generated modal inquiry hrefs are escaped.
- Validator checks Escape/backdrop/close behavior is wired.

---

## Task 2: Implement modal structure and styling

**Objective:** Add the modal shell and responsive premium styling.

**Files:**
- Modify: `index.html`

**Steps:**
1. Add modal CSS near the watch card styles.
2. Add modal markup near the bottom of `body`.
3. Include a close button, backdrop area, content panel, and body container.
4. Add `body.modal-open` scroll locking.

**Acceptance criteria:**
- Modal is hidden by default.
- Modal opens as a fixed overlay.
- Desktop layout supports gallery + listing details.
- Mobile layout remains single-column and scrollable.

---

## Task 3: Render modal content from inventory data

**Objective:** Populate the modal from the selected watch object.

**Files:**
- Modify: `index.html`

**Steps:**
1. Cache loaded inventory after `/data/watches.json` fetch.
2. Add a `renderProductDetailModal(watch, inventory)` helper.
3. Add specs/trust rows from watch fields.
4. Render all gallery images from `watch.images`.
5. Use `buildInquiryHref(watch, inventory)` and escape the href before interpolation.
6. Add a direct inquiry CTA and secondary status/disclosure copy.

**Acceptance criteria:**
- No hardcoded watch names/details inside modal source markup.
- Modal content updates based on clicked watch.
- Inquiry CTA uses per-watch `inquirySubject` and `inquiryBody`.
- All dynamic text/attributes pass through `escapeHtml()`.

---

## Task 4: Wire card trigger and accessibility interactions

**Objective:** Make the modal usable and safe.

**Files:**
- Modify: `index.html`

**Steps:**
1. Add `DETAILS →` trigger to each rendered watch card.
2. Add event delegation on `#carousel-track` for `[data-product-modal-trigger]`.
3. Add close button, backdrop click, and Escape key handling.
4. Save and restore focus after modal close.
5. Lock body scroll while modal is open.

**Acceptance criteria:**
- Clicking details opens the selected watch.
- Mailto inquiry links still work independently.
- Escape and backdrop close the modal.
- Keyboard users have a clear close control.

---

## Task 5: Update roadmap and verify

**Objective:** Keep the operating roadmap current and ship through PR workflow.

**Files:**
- Modify: `docs/WATCH_ALLEY_ROADMAP.md`
- Modify: `docs/plans/2026-04-28-sprint-1-conversion-trust-foundation.md`

**Verification:**
```bash
pnpm test
pnpm build
git diff --check
```

**Review:**
- Run a static scan over the diff.
- Run independent code review before commit.
- Push branch and open a GitHub PR.

**Definition of done:**
- Buyers can open any watch and see condition, inclusion/set, material, movement, case size, edition, disclosure, gallery, price, status, and a direct inquiry CTA.
- `pnpm test` and `pnpm build` pass.
- Roadmap and sprint plan reflect the completed phase.
