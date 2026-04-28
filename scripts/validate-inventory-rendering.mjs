import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const indexPath = path.join(projectRoot, 'index.html');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');

const indexHtml = readFileSync(indexPath, 'utf8');
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));

function fail(message) {
  console.error(`Inventory rendering validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(
  indexHtml.includes('data-inventory-source="supabase"'),
  'carousel track must use Supabase as the live inventory source'
);
assert(
  indexHtml.includes('data-inventory-fallback="/data/watches.json"'),
  'carousel track must keep /data/watches.json only as a resilience fallback'
);

const arrivalsMatch = indexHtml.match(/<section id="arrivals">[\s\S]*?<\/section>/);
assert(arrivalsMatch, 'missing arrivals section');

const trackMatch = arrivalsMatch[0].match(
  /<div class="carousel-track stagger" id="carousel-track"[^>]*>([\s\S]*?)\n  <\/div>\n\n  <div class="carousel-progress">/
);
assert(trackMatch, 'could not isolate carousel-track source markup');

const trackSourceMarkup = trackMatch[1];

for (const watch of inventory.watches) {
  assert(
    !trackSourceMarkup.includes(watch.name),
    `carousel source still hardcodes inventory watch "${watch.name}"`
  );
  assert(
    !trackSourceMarkup.includes(watch.inquirySubject),
    `carousel source still hardcodes inquiry copy for "${watch.name}"`
  );
}

assert(
  /async function loadWatchInventory\s*\(/.test(indexHtml),
  'missing async loadWatchInventory() helper'
);
assert(
  /const SUPABASE_INVENTORY_ENDPOINT\s*=\s*['"]https:\/\/[^'"]+\.supabase\.co\/rest\/v1\/watches['"]/.test(indexHtml),
  'homepage must declare the public Supabase REST inventory endpoint'
);
assert(
  /const SUPABASE_ANON_KEY\s*=\s*['"]sb_publishable_[^'"]+['"]/.test(indexHtml),
  'homepage must use the Supabase publishable key for public inventory reads'
);
assert(
  /async function fetchLiveInventory\s*\(/.test(indexHtml),
  'missing fetchLiveInventory() helper for live Supabase reads'
);
assert(
  /function normalizeSupabaseInventory\s*\(/.test(indexHtml),
  'missing normalizeSupabaseInventory() helper to adapt Supabase rows to storefront inventory shape'
);
assert(
  /function toWatchInventoryItem\s*\(/.test(indexHtml),
  'missing toWatchInventoryItem() helper for snake_case to camelCase mapping'
);
assert(
  /headers\s*:\s*\{[\s\S]*apikey\s*:\s*SUPABASE_ANON_KEY[\s\S]*Authorization\s*:\s*`Bearer \$\{SUPABASE_ANON_KEY\}`[\s\S]*\}/.test(indexHtml),
  'live inventory fetch must send Supabase apikey and Bearer headers'
);
assert(
  /const PUBLIC_WATCH_COLUMNS\s*=\s*\[[\s\S]*'id'[\s\S]*'slug'[\s\S]*'primary_image'[\s\S]*'inquiry_body'[\s\S]*'display_order'[\s\S]*\]\.join\(['"],['"]\)/.test(indexHtml) &&
    /endpoint\.searchParams\.set\(\s*['"]select['"]\s*,\s*PUBLIC_WATCH_COLUMNS\s*\)/.test(indexHtml) &&
    /endpoint\.searchParams\.set\(\s*['"]order['"]\s*,\s*['"]status\.asc,display_order\.asc['"]\s*\)/.test(indexHtml),
  'live inventory fetch must request only explicit public watch columns ordered for storefront display'
);
assert(
  /condition_label/.test(indexHtml) && /primary_image/.test(indexHtml) && /inquiry_subject/.test(indexHtml) && /sold_at/.test(indexHtml),
  'Supabase row normalization must map snake_case columns needed by the storefront'
);
assert(
  /await fetchLiveInventory\(\)/.test(indexHtml) && /await fetchStaticInventoryFallback\(\)/.test(indexHtml),
  'inventory loader must try live Supabase first and fall back to the static JSON snapshot only on failure'
);
assert(
  /function revealRenderedInventoryContainers\s*\(/.test(indexHtml),
  'dynamic inventory render path must explicitly reveal async-injected inventory containers'
);
assert(
  /carouselTrack\.classList\.add\(['"]visible['"]\)/.test(indexHtml) &&
    /soldArchiveGrid\.classList\.add\(['"]visible['"]\)/.test(indexHtml) &&
    /revealRenderedInventoryContainers\(\)/.test(indexHtml),
  'inventory loader must mark carousel and sold archive containers visible after rendering so .stagger cards do not remain opacity: 0'
);
assert(
  /function renderWatchCard\s*\(/.test(indexHtml),
  'missing renderWatchCard() helper'
);
assert(
  !/fetch\(inventorySource\)/.test(indexHtml),
  'homepage must not rely on the static data-inventory-source JSON fetch as the primary inventory source'
);
assert(
  /renderWatchCard\(watch, index, (?:watches|activeWatches)\.length, inventory\)/.test(indexHtml),
  'inventory loader must render every active watch through renderWatchCard(watch, index, activeWatches.length, inventory)'
);
assert(
  /encodeURIComponent\(watch\.inquirySubject\)/.test(indexHtml),
  'inquiry links must use per-watch inquirySubject from inventory data'
);
assert(
  /encodeURIComponent\(watch\.inquiryBody\)/.test(indexHtml),
  'inquiry links must use per-watch inquiryBody from inventory data'
);
assert(
  /function safeEmail\s*\(/.test(indexHtml),
  'homepage must sanitize inventory inquiryEmail before building mailto links'
);
assert(
  /const email = safeEmail\(inventory\.inquiryEmail\)/.test(indexHtml),
  'buildInquiryHref must use safeEmail(inventory.inquiryEmail)'
);
assert(
  /href="\$\{escapeHtml\(inquiryHref\)\}"/.test(indexHtml),
  'rendered inquiry href must be HTML-escaped before attribute interpolation'
);

console.log(`Inventory rendering contract valid: ${inventory.watches.length} snapshot rows retained as fallback while storefront reads live Supabase inventory first.`);
