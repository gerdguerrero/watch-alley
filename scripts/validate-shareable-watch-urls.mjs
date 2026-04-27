import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const indexHtmlPath = path.join(projectRoot, 'index.html');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');

const indexHtml = readFileSync(indexHtmlPath, 'utf8');
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
if (watches.length === 0) {
  console.error('Shareable watch URLs validation failed: inventory has no watches.');
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Shareable watch URLs validation failed: ${message}`);
    process.exit(1);
  }
}

assert(
  /function getWatchHashSlug\s*\(/.test(indexHtml),
  'missing getWatchHashSlug() helper for hash-route parsing'
);
assert(
  /\^#\\?\/watch\\?\//.test(indexHtml) || /#\/watch\//.test(indexHtml),
  'index.html must reference the #/watch/ hash route'
);
assert(
  /function buildWatchShareUrl\s*\(/.test(indexHtml),
  'missing buildWatchShareUrl() helper for absolute deep links'
);
assert(
  /encodeURIComponent\s*\(\s*(?:slug|String\s*\(\s*slug\s*\)|slug\s*==\s*null\s*\?\s*['"][^'"]*['"]\s*:\s*String\s*\(\s*slug\s*\))\s*\)/.test(indexHtml),
  'buildWatchShareUrl must percent-encode the slug'
);
assert(
  /function openWatchBySlug\s*\(/.test(indexHtml),
  'missing openWatchBySlug() helper to open the modal for a slug'
);
assert(
  /window\.addEventListener\(\s*['"]hashchange['"]/.test(indexHtml),
  'index.html must register a hashchange listener'
);
assert(
  /window\.addEventListener\(\s*['"]popstate['"]/.test(indexHtml),
  'index.html must register a popstate listener for browser history navigation'
);
assert(
  /history\.pushState\s*\(/.test(indexHtml),
  'opening the modal must update browser history via history.pushState'
);
assert(
  /history\.replaceState\s*\(/.test(indexHtml),
  'initial deep-link load must use history.replaceState to avoid stacking history'
);
assert(
  /data-share-watch-url/.test(indexHtml),
  'product modal must expose a data-share-watch-url copy-link trigger'
);
assert(
  /navigator\.clipboard\.writeText/.test(indexHtml),
  'copy-link must use navigator.clipboard.writeText'
);
assert(
  /document\.execCommand\(\s*['"]copy['"]\s*\)/.test(indexHtml),
  'copy-link must include a fallback path using document.execCommand("copy")'
);
assert(
  /pendingShareSlug|deepLinkSlug|pendingDeepLinkSlug/.test(indexHtml),
  'inventory load must queue a pending deep-link slug to apply after fetch'
);
assert(
  /window\.scrollY/.test(indexHtml),
  'closing the modal must preserve scroll position via window.scrollY'
);

console.log(`Shareable watch URLs contract valid: ${watches.length} inventory watches share-ready.`);
