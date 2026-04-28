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
  console.error(`Product detail modal validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function extractFunctionSource(functionName) {
  const signature = `function ${functionName}`;
  const start = indexHtml.indexOf(signature);
  assert(start >= 0, `missing ${functionName}() helper`);

  const bodyStart = indexHtml.indexOf('{', start);
  assert(bodyStart >= 0, `could not find ${functionName}() function body`);

  let depth = 0;
  for (let index = bodyStart; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return indexHtml.slice(start, index + 1);
  }

  fail(`could not isolate ${functionName}() source`);
}

assert(
  /<div class="product-modal" id="product-detail-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="product-modal-title"[^>]*aria-hidden="true"/.test(indexHtml),
  'missing accessible #product-detail-modal dialog shell'
);
assert(indexHtml.includes('id="product-modal-backdrop"'), 'missing product modal backdrop');
assert(indexHtml.includes('id="product-modal-close"'), 'missing product modal close button');
assert(indexHtml.includes('id="product-modal-body"'), 'missing product modal dynamic body container');
assert(indexHtml.includes('body.modal-open'), 'missing body.modal-open scroll-lock styling');
assert(indexHtml.includes('.product-modal.open'), 'missing .product-modal.open visible state styling');

const modalShellMatch = indexHtml.match(/<div class="product-modal" id="product-detail-modal"[\s\S]*?<\/div>\n\n<!-- 09 Footer -->/);
assert(modalShellMatch, 'could not isolate product modal source markup');
for (const watch of inventory.watches) {
  assert(!modalShellMatch[0].includes(watch.name), `modal shell must not hardcode watch "${watch.name}"`);
  assert(!modalShellMatch[0].includes(watch.inquirySubject), `modal shell must not hardcode inquiry copy for "${watch.name}"`);
}

assert(
  /data-product-modal-trigger/.test(indexHtml),
  'rendered watch cards need a data-product-modal-trigger control'
);
assert(
  /data-watch-slug="\$\{escapeHtml\(watch\.slug\)\}"/.test(indexHtml),
  'product modal trigger must carry the inventory watch slug'
);
assert(
  /const watchInventoryCache\s*=\s*\{\s*watches:\s*\[\]\s*\}/.test(indexHtml),
  'missing watchInventoryCache initialized with a watches array'
);
assert(
  /watchInventoryCache\.watches\s*=\s*watches/.test(indexHtml),
  'loadWatchInventory() must cache the loaded watches for modal lookup'
);

const renderSource = extractFunctionSource('renderProductDetailModal');
for (const requiredSnippet of [
  'watch.reference',
  'watch.conditionLabel',
  'watch.set',
  'watch.material',
  'watch.movement',
  'watch.caseSize',
  'watch.edition',
  'watch.disclosure',
  'watch.images',
  'watch.status',
  'formatPrice(watch)',
  'buildInquiryHref(watch, inventory)',
  'escapeHtml(inquiryHref)'
]) {
  assert(renderSource.includes(requiredSnippet), `renderProductDetailModal() must use ${requiredSnippet}`);
}
assert(
  /data-mailto-fallback="\$\{escapeHtml\(inquiryHref\)\}"/.test(renderSource),
  'modal inquiry mailto fallback must be HTML-escaped before attribute interpolation'
);
assert(
  /function openProductDetailModal\s*\(watch\b[^)]*\)/.test(indexHtml),
  'missing openProductDetailModal(watch) helper'
);
assert(
  /productModalBody\.innerHTML\s*=\s*renderProductDetailModal\(watch, watchInventoryCache\)/.test(indexHtml),
  'openProductDetailModal() must render selected watch from cached inventory'
);
assert(
  /function closeProductDetailModal\s*\([^)]*\)/.test(indexHtml),
  'missing closeProductDetailModal() helper'
);
assert(
  /document\.body\.classList\.add\('modal-open'\)/.test(indexHtml),
  'opening modal must lock page scroll'
);
assert(
  /document\.body\.classList\.remove\('modal-open'\)/.test(indexHtml),
  'closing modal must unlock page scroll'
);
assert(
  /productModalClose\.addEventListener\('click',\s*(?:closeProductDetailModal|\(\s*\)\s*=>\s*closeProductDetailModal\([^)]*\))\)/.test(indexHtml),
  'close button must close the modal'
);
assert(
  /productModalBackdrop\.addEventListener\('click',\s*(?:closeProductDetailModal|\(\s*\)\s*=>\s*closeProductDetailModal\([^)]*\))\)/.test(indexHtml),
  'backdrop click must close the modal'
);
assert(
  /document\.addEventListener\('keydown',[\s\S]*event\.key === 'Escape'[\s\S]*closeProductDetailModal\([^)]*\)/.test(indexHtml),
  'Escape key must close the modal'
);
assert(
  /function getFocusableModalElements\s*\(\)/.test(indexHtml),
  'missing getFocusableModalElements() helper for modal focus containment'
);
assert(
  /function trapProductModalFocus\s*\(event\)/.test(indexHtml),
  'missing trapProductModalFocus(event) helper'
);
assert(
  /event\.key !== 'Tab'/.test(indexHtml) && /event\.shiftKey/.test(indexHtml),
  'modal focus trap must handle Tab and Shift+Tab navigation'
);
assert(
  /productModal\.addEventListener\('keydown', trapProductModalFocus\)/.test(indexHtml),
  'modal keydown handler must trap focus while the modal is open'
);
assert(
  /let isDragging = false, dragStartX = 0, scrollStartLeft = 0, dragMoved = false/.test(indexHtml),
  'carousel drag tracking must include an explicit dragMoved flag'
);
assert(
  /if \(dragMoved\) return;/.test(indexHtml),
  'product detail trigger must use dragMoved instead of stale scrollLeft comparisons'
);
assert(
  !/carouselTrack\.addEventListener\('click',[\s\S]*Math\.abs\(carousel\.scrollLeft - scrollStartLeft\) > 4[\s\S]*openProductDetailModal\(watch\)/.test(indexHtml),
  'product detail trigger must not gate opening on stale carousel scrollLeft comparisons'
);
assert(
  /carouselTrack\.addEventListener\('click',[\s\S]*data-product-modal-trigger[\s\S]*openProductDetailModal\(watch[^)]*\)/.test(indexHtml),
  'carousel must open modal through delegated product detail trigger'
);

console.log(`Product detail modal contract valid: ${inventory.watches.length} inventory watches can open detail views.`);
