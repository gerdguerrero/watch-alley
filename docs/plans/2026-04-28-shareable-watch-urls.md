# Watch Alley Shareable Watch URLs Implementation Plan

Date: 2026-04-28
Phase: 1 (Conversion + Trust Foundation)
Branch: `buloy/shareable-watch-urls`
Owner: Hermes / Buloy

## Why this phase

Watch Alley's primary distribution channels are Viber, Instagram, and Messenger. Right now there is no way to share a specific watch — every share lands on the homepage. Buyers must scroll/search before they can inquire, which adds friction and kills inquiry velocity.

Making each watch individually addressable through a URL is the highest-leverage next move because it:

1. Lets Buloy paste a direct watch link in Viber drops, IG bio, story stickers, and DMs.
2. Lets buyers bookmark and return to a specific listing.
3. Lays the foundation for future SEO / canonical URLs / OG previews.
4. Lays the foundation for inquiry source tracking.
5. Lays the foundation for admin caption/share post generation in Phase 7.
6. Costs almost nothing in UI surface or risk.

## Scope (in)

- Each watch in `public/data/watches.json` is reachable by a shareable URL of the form `/#/watch/<slug>`.
- Visiting `/#/watch/<slug>` automatically opens the product detail modal for that watch.
- Opening the product detail modal updates the URL hash to `#/watch/<slug>`.
- Closing the modal clears the watch hash without losing scroll position.
- Browser back/forward navigation between modal-open and modal-closed states works.
- Modal includes a "Copy link" action that copies the absolute deep link to the clipboard.
- Carousel scroll position and other state must remain stable when opening/closing the modal via URL.
- New validator `scripts/validate-shareable-watch-urls.mjs` enforces this contract and is included in `pnpm test`.

## Scope (out, intentionally deferred)

- Real per-watch routes (`/watch/<slug>`) and server-side rendering. Hash routes are sufficient because the site is a single static `index.html`. A real route refactor belongs in Phase 6 SEO.
- Open Graph and Twitter Card meta tags per watch. Hash-only URLs cannot serve dynamic OG meta to crawlers, so this is intentionally deferred until prerendering or a serverless route layer exists.
- Inventory search/filter, multi-image gallery, lead capture forms — separate phases.

## Files

- Modify: `index.html`
- Create: `scripts/validate-shareable-watch-urls.mjs`
- Modify: `package.json`
- Modify: `docs/WATCH_ALLEY_ROADMAP.md`
- Create: `docs/plans/2026-04-28-shareable-watch-urls.md`

## Steps

1. Add `scripts/validate-shareable-watch-urls.mjs` enforcing the contract:
   - `index.html` exposes a hash-route helper that maps `#/watch/<slug>` to a watch.
   - `index.html` registers a `hashchange` listener that opens the modal for the matching slug.
   - On initial page load, if the URL already targets a watch hash, the modal opens once inventory loads.
   - Opening the modal calls `history.pushState` (or `replaceState` on initial deep link) to update the URL.
   - Closing the modal restores a clean URL without watch hash and does not jump scroll.
   - The modal exposes a "Copy link" trigger with `data-share-watch-url`.
   - The Copy link uses `navigator.clipboard.writeText` with a fallback path.
   - Slug-based URL generation must percent-encode the slug.
2. Wire the new validator into `pnpm test`.
3. Implement in `index.html`:
   - Add `getWatchHashSlug()` and `buildWatchShareUrl(slug)`.
   - Add `openWatchBySlug(slug)` that finds the watch in `watchInventoryCache` and opens the modal.
   - Update `openProductDetailModal()` to push state and update the URL.
   - Update `closeProductDetailModal()` to push state to the clean URL.
   - Add `popstate`/`hashchange` listener to react to browser navigation.
   - On inventory ready, if a hash already targets a watch, open it.
   - Add a "Copy link" button inside the modal header/actions area.
4. Browser-verify:
   - Visit `/#/watch/<slug>` — modal opens.
   - Open a watch via card click — URL updates.
   - Press back — modal closes, URL clean.
   - Press forward — modal reopens.
   - Copy link button copies the correct absolute URL.
5. Run verification suite: `pnpm test`, `pnpm build`, `git diff --check`, static scan, independent review.
6. Update roadmap progress log.
7. Commit, push, open PR.

## Risks and mitigations

- Risk: `history.pushState` interferes with scroll restoration.
  Mitigation: capture and restore `window.scrollY` on close; do not rely on `location.hash` assignment alone.
- Risk: Clipboard API rejected in non-secure contexts.
  Mitigation: gracefully fall back to a hidden `<textarea>` + `document.execCommand('copy')` and surface a tiny inline confirmation.
- Risk: Slug collisions or special characters.
  Mitigation: validator already enforces slug uniqueness. URL-encode all slug interpolations.
- Risk: Hash-driven modal opens before inventory has loaded.
  Mitigation: queue the requested slug and trigger after inventory fetch resolves.

## Definition of done

- A direct `/#/watch/<slug>` URL renders the homepage with the matching product detail modal already open.
- The modal's URL state is preserved across browser navigation.
- The Copy link button reliably copies the absolute URL.
- `pnpm test`, `pnpm build`, `git diff --check`, static scan, and independent review all pass.
- Roadmap progress log records this phase.

## Verification commands

```bash
pnpm test
pnpm build
git diff --check
```
