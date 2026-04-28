# Watch Alley Sold Archive Implementation Plan (Phase 2 Starter)

Date: 2026-04-28
Phase: 2 (Inventory OS) — starter slice
Branch: `buloy/sold-archive`
Owner: Hermes / Buloy

## Why this phase next

Sold watches today disappear forever from Watch Alley. That throws away three free assets:

1. Trust. Visible sold inventory is the cheapest credibility signal a small dealer can show.
2. SEO. Each sold reference is a long-tail page-equivalent we can later promote to a real route.
3. Demand signal. "What sold and how fast" is the single most useful collector data Buloy has.

The Sold Archive starter turns sold listings into permanent, addressable, browse-able trust assets without committing to a heavier CMS or admin interface yet.

## Scope (in)

- Add optional inventory fields for sold listings: `soldAt` (YYYY-MM) and `soldPrice` (non-negative integer in PHP).
- Backfill 3 sample sold watches in `public/data/watches.json` so the archive has real content on first ship.
- Filter the homepage arrivals carousel so it only renders non-sold watches.
- Add a homepage Sold Archive section rendering all sold watches as compact "social proof" cards.
- Keep deep links working for sold slugs — opening the product detail modal still works for sold pieces.
- Hide the inquire CTA on sold watches in the modal and replace it with a sold-status note pointing users to message Watch Alley for similar references.
- Add `scripts/validate-sold-archive.mjs` and wire it into `pnpm test`.
- Update existing validators where regex assumptions need to relax to fit the active-watch filter rename.
- Update roadmap progress log and Phase 2 checklist.

## Scope (out, intentionally deferred)

- Per-sold-watch SEO routes / prerendered `/sold/<slug>` pages — Phase 6 SEO.
- Admin UI to mark watches as sold — Phase 7 admin/automation.
- Search/filter/sort across sold archive — Phase 2 follow-up once the archive grows.
- Sold price ranges / hide-price toggle — out of scope for the starter.

## Files

- Modify: `public/data/watches.json` (3 sample sold listings)
- Modify: `scripts/validate-watch-data.mjs` (allow optional `soldAt` / `soldPrice` and require them when status=sold)
- Modify: `scripts/validate-inventory-rendering.mjs` (relax `renderWatchCard` arg regex to accept the filtered active-watch source)
- Create: `scripts/validate-sold-archive.mjs`
- Modify: `package.json` (wire new validator into `pnpm test`)
- Modify: `index.html` (filter active watches, render Sold Archive section, hide inquire CTA on sold modal, add sold-card render helper)
- Modify: `docs/WATCH_ALLEY_ROADMAP.md` (Phase 2 progress + log)
- Create: `docs/plans/2026-04-28-sold-archive.md`

## Steps

1. Write the plan (this file).
2. Add failing validator `scripts/validate-sold-archive.mjs` covering:
   - `index.html` declares a `#sold-archive` section.
   - `index.html` exposes `renderSoldCard(watch)` and a `sold-archive-grid` container.
   - The carousel pipeline uses an `activeWatches` filter that excludes sold.
   - The product detail modal hides the inquire CTA when status is sold.
3. Update `scripts/validate-watch-data.mjs`:
   - When `status === 'sold'`, require `soldAt` matching `^\d{4}-\d{2}$` and `soldPrice` as a non-negative integer.
   - When present, validate the same shapes for non-sold rows (still allowed for record-keeping).
   - Update the success log to also report sold count.
4. Update `scripts/validate-inventory-rendering.mjs` to accept either the legacy `watches.length` or a filtered `activeWatches.length` invocation pattern in the carousel renderer.
5. Add 3 sample sold watches in `public/data/watches.json` with `status: "sold"`, `soldAt`, and `soldPrice`. Reuse already-on-disk `/watch-assets/` images.
6. Implement in `index.html`:
   - Add CSS for `.sold-archive`, `.sold-archive-grid`, `.sold-card`, `.sold-card-status`, `.sold-card-meta`.
   - Add a new `<section id="sold-archive">` between the existing arrivals/Viber sections with a strap-line and grid container.
   - Add `renderSoldCard(watch)` helper.
   - In `loadWatchInventory`, split the inventory into `activeWatches` (status !== sold) and `soldWatches` (status === sold), render active into the carousel and sold into the archive grid.
   - In `renderProductDetailModal(watch)`, when status is sold, hide the inquire CTA and show a "This piece is sold" note with a link to the inquiry email for similar references.
7. Browser-verify:
   - Active carousel only shows non-sold watches.
   - Sold Archive section renders the 3 sold watches.
   - Clicking a sold card opens the modal showing the sold state.
   - Inquire CTA does not appear for sold watches in the modal.
   - Deep link `/#/watch/<sold-slug>` still opens the modal.
   - `pnpm test`, `pnpm build`, `git diff --check` all pass.
8. Independent reviewer pass.
9. Update roadmap log.
10. Commit, push, open PR.

## Risks and mitigations

- Risk: filtering breaks existing inventory rendering validator.
  Mitigation: relax the regex in `scripts/validate-inventory-rendering.mjs` once and document the change.
- Risk: deep link to a now-sold slug surprises buyers.
  Mitigation: modal clearly shows sold state and removes the inquire button so the deep link still informs without inviting an inquiry that cannot be fulfilled.
- Risk: schema migration breaks build for users with cached JSON.
  Mitigation: new fields are optional except when status is sold; validator enforces only the new contract.

## Definition of done

- `pnpm test` and `pnpm build` pass with the new sold archive validator and updated data validator.
- Active carousel renders only non-sold watches.
- A Sold Archive section is visible on the homepage with the 3 sample sold watches.
- Modal reflects sold status and suppresses the inquire CTA.
- Deep link to a sold watch slug opens the modal correctly.
- Roadmap progress log updated.

## Verification commands

```bash
pnpm test
pnpm build
git diff --check
```
