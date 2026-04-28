import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');
const indexHtmlPath = path.join(projectRoot, 'index.html');
const optimizerPath = path.join(projectRoot, 'scripts', 'optimize-images.mjs');

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const indexHtml = readFileSync(indexHtmlPath, 'utf8');
const optimizer = readFileSync(optimizerPath, 'utf8');

function fail(message) {
  console.error(`Image pipeline validation failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }

// ── Optimizer must produce both AVIF and WebP variants at 1600w and 800w ──
assert(/encoder:\s*['"]avif['"]/.test(optimizer),
  'scripts/optimize-images.mjs must emit AVIF variants alongside WebP');
assert(/-1600\.avif/.test(optimizer) && /-800\.avif/.test(optimizer),
  'optimizer must produce both 1600w and 800w AVIF variants');
assert(/-1600\.webp/.test(optimizer) && /-800\.webp/.test(optimizer),
  'optimizer must produce both 1600w and 800w WebP variants');

// ── Storefront <picture> must offer AVIF before WebP before raster ──
assert(
  /<source type="image\/avif" srcset="\$\{escapeHtml\(sources\.avif800\)\} 800w, \$\{escapeHtml\(sources\.avif1600\)\} 1600w"/.test(indexHtml),
  'renderResponsivePicture() must emit an AVIF source before WebP'
);
assert(
  /<source type="image\/webp" srcset="\$\{escapeHtml\(sources\.webp800\)\} 800w, \$\{escapeHtml\(sources\.webp1600\)\} 1600w"/.test(indexHtml),
  'renderResponsivePicture() must keep the WebP source as a second-tier fallback'
);
assert(
  /avif1600:\s*`\$\{stem\}-1600\.avif`/.test(indexHtml) && /avif800:\s*`\$\{stem\}-800\.avif`/.test(indexHtml),
  'responsiveSources() must compute -1600.avif and -800.avif sibling paths'
);

// ── Every inventory raster image must have all four next-gen variants on disk ──
const expectedVariants = ['-1600.avif', '-800.avif', '-1600.webp', '-800.webp'];
let watchesChecked = 0;
let imagesChecked = 0;

for (const watch of inventory.watches) {
  watchesChecked += 1;
  if (!Array.isArray(watch.images)) continue;
  for (const image of watch.images) {
    if (typeof image !== 'string' || image.length === 0) continue;
    const dot = image.lastIndexOf('.');
    if (dot <= 0) continue;
    const ext = image.slice(dot + 1).toLowerCase();
    // Skip images that are already a next-gen format (no source to optimize from).
    if (ext === 'webp' || ext === 'avif') continue;
    imagesChecked += 1;
    const stem = image.slice(0, dot);
    for (const variant of expectedVariants) {
      const expectedPublicPath = `${stem}${variant}`;
      const onDisk = path.join(projectRoot, 'public', expectedPublicPath);
      assert(
        existsSync(onDisk),
        `${watch.slug || 'watch'}: missing ${variant} variant for ${image}. Run \`pnpm optimize:images\`.`
      );
    }
  }
}

// ── Image fade-in animation present + reduced-motion guarded ──
assert(/@keyframes wa-img-fade-in/.test(indexHtml),
  'storefront must define a wa-img-fade-in keyframes animation for tasteful image entry');
assert(/@media \(prefers-reduced-motion: reduce\)/.test(indexHtml),
  'storefront must guard the image fade-in behind prefers-reduced-motion');

console.log(`Image pipeline contract valid: ${imagesChecked} inventory images across ${watchesChecked} watches have AVIF + WebP at 1600w and 800w.`);
