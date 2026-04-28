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

assert(
  /<section\s+id="sold-archive"/.test(indexHtml),
  'index.html must declare a <section id="sold-archive"> element'
);

assert(
  /id="sold-archive-grid"/.test(indexHtml),
  'index.html must declare a sold-archive-grid container with id="sold-archive-grid"'
);

assert(
  /function renderSoldCard\s*\(\s*watch\b/.test(indexHtml),
  'index.html must define renderSoldCard(watch) for the Sold Archive section'
);

assert(
  /\.filter\(\(?\s*\w+\s*\)?\s*=>\s*\w+\.status\s*!==\s*['"]sold['"]\)/.test(indexHtml),
  'inventory loader must filter sold watches out of the active carousel'
);

assert(
  /\.filter\(\(?\s*\w+\s*\)?\s*=>\s*\w+\.status\s*===\s*['"]sold['"]\)/.test(indexHtml),
  'inventory loader must select sold watches for the Sold Archive grid'
);

assert(
  /soldArchiveGrid\.innerHTML\s*=/.test(indexHtml),
  'inventory loader must populate soldArchiveGrid.innerHTML with sold cards'
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
  /data-watch-slug=/.test(indexHtml) && /sold-card/.test(indexHtml),
  'sold cards must expose data-watch-slug so deep linking continues to work'
);

console.log(`Sold archive contract valid: ${soldWatches.length} sold watches archived.`);
