import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const indexPath = path.join(projectRoot, 'index.html');
const soldPath = path.join(projectRoot, 'sold.html');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');

const indexHtml = readFileSync(indexPath, 'utf8');
const soldHtml = readFileSync(soldPath, 'utf8');
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));

function fail(message) {
  console.error(`Sold archive validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
const soldWatches = watches.filter((w) => w && w.status === 'sold');

assert(
  soldWatches.length >= 1,
  'inventory must include at least one sold watch so the Sold Archive renders'
);

for (const watch of soldWatches) {
  assert(
    typeof watch.soldAt === 'string' && /^\d{4}-\d{2}$/.test(watch.soldAt),
    `sold watch ${watch.slug} must have soldAt in YYYY-MM format`
  );
  assert(
    Number.isInteger(watch.soldPrice) && watch.soldPrice >= 0,
    `sold watch ${watch.slug} must have non-negative integer soldPrice`
  );
}

// Page-level structure now lives on sold.html (moved off the homepage per the
// 2026-05 client feedback — Sold Archive gets its own dedicated page).
assert(
  /id="sold-archive-grid"/.test(soldHtml),
  'sold.html must declare a sold-archive-grid container with id="sold-archive-grid"'
);

assert(
  /class="sold-archive-title"/.test(soldHtml),
  'sold.html must render a Sold Archive title heading'
);

assert(
  /<nav\s+id="main-nav"/.test(soldHtml),
  'sold.html must use the unified main-nav so the navbar matches the homepage'
);

// Filter / status logic still lives in index.html (the homepage inventory
// loader is the single source of truth that downstream pages reuse).
assert(
  /\.filter\(\(?\s*\w+\s*\)?\s*=>\s*\w+\.status\s*!==\s*['"]sold['"]\)/.test(indexHtml),
  'inventory loader must filter sold watches out of the active carousel'
);

assert(
  /\.filter\(\(?\s*\w+\s*\)?\s*=>\s*\w+\.status\s*===\s*['"]sold['"]\)/.test(indexHtml),
  'inventory loader must select sold watches into a sold-only collection'
);

assert(
  /watch\.status\s*===\s*['"]sold['"]/.test(indexHtml) && /sold-card-status|product-modal-sold/.test(indexHtml),
  'product detail modal must render a sold-state branch for sold watches'
);

assert(
  /status\s*===\s*['"]sold['"]/.test(indexHtml) ? !/<a[^>]*class="btn-primary"[^>]*>\s*Inquire About This Watch/.test(indexHtml.replace(/[\s\S]*status\s*===\s*['"]sold['"][\s\S]*?(?=<\/section>|<\/script>)/, '')) : true,
  'inquire CTA must not render unconditionally when watch is sold (handle inside renderProductDetailModal sold branch)'
);

assert(
  /class="sold-card"/.test(soldHtml),
  'sold.html must render sold cards using the .sold-card class'
);

assert(
  /\/watch\/\$\{[^}]*slug/.test(soldHtml),
  'sold.html cards must link to /watch/:slug so deep linking continues to work'
);

console.log(`Sold archive contract valid: ${soldWatches.length} sold watches archived.`);
