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
  indexHtml.includes('data-inventory-source="/data/watches.json"'),
  'carousel track must declare data-inventory-source="/data/watches.json"'
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
  /function renderWatchCard\s*\(/.test(indexHtml),
  'missing renderWatchCard() helper'
);
assert(
  /fetch\(inventorySource\)/.test(indexHtml),
  'homepage must fetch the declared inventory source'
);
assert(
  /renderWatchCard\(watch, index, watches\.length, inventory\)/.test(indexHtml),
  'inventory loader must render every watch through renderWatchCard(watch, index, watches.length, inventory)'
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

console.log(`Inventory rendering contract valid: ${inventory.watches.length} cards generated from /data/watches.json.`);
