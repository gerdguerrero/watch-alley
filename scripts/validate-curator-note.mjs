// Curator's Note + dynamic hero featured card contract validator
// (Wave 4 of Bet 3).
//
// Pins the storefront polish so future edits don't accidentally:
//   • bring back the 16-tile fake Instagram grid (the removed
//     #instagram / .ig-grid / .ig-tile / .ig-stories tree)
//   • drop the Curator's Note section from the homepage
//   • leave the hero featured card hardcoded to a single watch instead of
//     reading featured=true from inventory

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const indexHtml = readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const inventory = JSON.parse(
  readFileSync(path.join(projectRoot, 'public', 'data', 'watches.json'), 'utf8')
);

function fail(msg) {
  console.error(`Curator's Note contract validation failed: ${msg}`);
  process.exit(1);
}
function assert(cond, msg) { if (!cond) fail(msg); }

// ── Fake Instagram grid is gone ────────────────────────────────────
for (const banned of [
  /<section id="instagram"/i,
  /class="ig-grid"/,
  /class="ig-tile"/,
  /class="ig-stories"/,
  /class="ig-story-ring"/,
  /class="ig-follow-link"/,
]) {
  assert(!banned.test(indexHtml), `the fake Instagram section must stay removed (matched ${banned})`);
}

// ── Curator's Note section is present ──────────────────────────────
assert(/<section id="curator-note"/.test(indexHtml), 'index.html must declare a <section id="curator-note">');
assert(/class="curator-note-grid"/.test(indexHtml), 'curator-note must use the .curator-note-grid layout');
assert(/class="curator-note-photo[^"]*"/.test(indexHtml), 'curator-note must include the .curator-note-photo figure');
assert(/class="curator-note-headline serif"/.test(indexHtml), 'curator-note must include the Petrona headline');
assert(/class="curator-note-body"/.test(indexHtml), 'curator-note must include the Spectral body paragraph');
assert(/class="curator-note-signoff"/.test(indexHtml), 'curator-note must include a signoff line');
// Heritage-craft register: section ships its own per-tag styling.
assert(/#curator-note\s*\{/.test(indexHtml), '#curator-note must have its own CSS rule block');
assert(/\.curator-note-grid\s*\{[\s\S]*?display\s*:\s*grid/.test(indexHtml), '.curator-note-grid must use display:grid');

// ── Hero featured card is data-driven ──────────────────────────────
for (const id of [
  'hero-featured-card', 'hero-card-eyebrow', 'hero-card-name',
  'hero-card-specs', 'hero-card-price', 'hero-card-inquire',
]) {
  assert(indexHtml.includes(`id="${id}"`), `hero featured card must declare #${id} for the data-driven rewrite`);
}
assert(/function pickFeaturedWatch\(/.test(indexHtml), 'storefront must define pickFeaturedWatch()');
assert(/function renderHeroFeaturedCard\(/.test(indexHtml), 'storefront must define renderHeroFeaturedCard()');
assert(/renderHeroFeaturedCard\(activeWatches\)/.test(indexHtml), 'inventory loader must call renderHeroFeaturedCard(activeWatches)');
assert(/featured\s*===\s*true/.test(indexHtml), 'pickFeaturedWatch must select watches with featured === true first');

// ── At least one watch in the JSON fallback carries featured=true so the
// hero card has something to render even when Supabase is unreachable.
const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
const featuredCount = watches.filter((w) => w.featured === true).length;
assert(
  featuredCount >= 1,
  `public/data/watches.json must seed at least one watch with featured=true (found ${featuredCount})`
);

console.log(`Curator's Note contract valid: fake Instagram grid removed, editorial section in place, hero featured card driven by ${featuredCount} featured watch(es).`);
