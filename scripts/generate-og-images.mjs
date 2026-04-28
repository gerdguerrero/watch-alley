// Build-time OG image generator for The Watch Alley.
//
// For every watch in public/data/watches.json, composites a 1200x630 JPG card
// to public/og/<slug>.jpg using sharp + the watch's primary PNG. JPG keeps
// each card under ~150 KB so social platforms cache it cleanly (Facebook
// flags PNGs over 300 KB and won't crawl them).
//
// Layout (atelier handwritten note tone):
//   • Walnut-deep ground (oklch 0.13 0.012 55 ≈ #1a1814)
//   • Watch hero photo, contained, on the right ~55% with subtle drop shadow
//   • Editorial column on the left ~45%:
//       - "THE WATCH ALLEY · MANILA" eyebrow (mono caps, gold)
//       - Watch name in Petrona display (large)
//       - Brand · reference in Spectral italic (medium)
//       - Price in Petrona italic (gold)
//   • Thin gold rule above and below the editorial column
//
// Run via `pnpm prebuild` (auto-invoked before `pnpm build`). Re-running is
// idempotent — the output PNG is overwritten in place. Public/og/ is committed
// to git so production deploys ship the cards even if the script is skipped.

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');
const watchAssetsDir = path.join(projectRoot, 'public', 'watch-assets');
const ogOutDir = path.join(projectRoot, 'public', 'og');

const W = 1200;
const H = 630;

// Heritage-craft palette, sRGB hex equivalents of the OKLCH tokens. Stitch's
// linter expects sRGB hex; OKLCH stays canonical in CSS. Re-derive these from
// :root in index.html if the design tokens drift.
const COLORS = {
  walnutDeep: '#191713',
  walnutCard: '#2b2620',
  cream: '#ece4d3',
  cream80: '#cec7b8',
  cream60: '#a39c8f',
  gold: '#c9a24b',
  gold20: '#3a2e16', // gold rule on dark, perceptual
};

function fail(message) {
  console.error(`OG generator failed: ${message}`);
  process.exit(1);
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[c]));
}

function formatPhp(price) {
  if (!Number.isFinite(price)) return '';
  return `₱ ${Number(price).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

// Resolve the watch's primary PNG on disk. The JSON points at /watch-assets/
// which Vite serves from /public/watch-assets/.
function resolveWatchImage(watch) {
  const primary = watch.primaryImage || (Array.isArray(watch.images) ? watch.images[0] : '');
  if (!primary) return null;
  const filename = primary.replace(/^\/+/, '').replace(/^public\//, '');
  const candidate = path.join(projectRoot, 'public', filename.replace(/^public\//, ''));
  if (existsSync(candidate)) return candidate;
  // Fallback: try /watch-assets/<basename>.png alongside whatever extension was given.
  const base = path.basename(primary).replace(/\.[^.]+$/, '');
  const fallback = path.join(watchAssetsDir, `${base}.png`);
  if (existsSync(fallback)) return fallback;
  return null;
}

// Wrap a string into max `lines` lines of at most `perLine` characters,
// breaking on word boundaries. Returns an array of trimmed lines.
function wrapText(text, perLine, maxLines) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= perLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // If we ran out of room mid-word, ellipsize the last line.
  if (lines.length === maxLines) {
    const joined = lines.join(' ');
    const remaining = String(text).slice(joined.length).trim();
    if (remaining) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = (last + '…').slice(0, perLine);
    }
  }
  return lines;
}

// Build the editorial-column SVG that gets composited over the walnut ground.
// Uses Petrona/Spectral/JetBrains Mono via web-safe stack fallbacks (renderer
// has these system-installed on macOS; on CI we fall back to Georgia/Menlo).
function buildEditorialSvg(watch) {
  const eyebrow = 'THE WATCH ALLEY · MANILA';
  const nameLines = wrapText(watch.name || '', 22, 3);
  const meta = [watch.brand, watch.reference].filter(Boolean).join(' · ');
  const isSold = watch.status === 'sold';
  const priceText = isSold
    ? `Placed${watch.soldPrice ? ` for ${formatPhp(watch.soldPrice)}` : ''}`
    : formatPhp(watch.price);

  // Vertical rhythm: pad-top → eyebrow → rule → name → meta → rule → price
  // Anchor everything to a 540-px-wide column starting at x=64.
  const X = 64;
  const COL_W = 470;
  const TOP = 96;
  const RULE_TOP = TOP + 30;
  const NAME_TOP = RULE_TOP + 70;
  const NAME_LH = 64;
  const NAME_BOTTOM = NAME_TOP + nameLines.length * NAME_LH;
  const META_TOP = NAME_BOTTOM + 8;
  const RULE_BOTTOM = META_TOP + 56;
  const PRICE_TOP = RULE_BOTTOM + 56;

  // Petrona is a serif; substitute Georgia for portability. Spectral italic
  // → Georgia italic. JetBrains Mono → Menlo / Monaco.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="vignette" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COLORS.walnutDeep}" stop-opacity="1"/>
      <stop offset="55%" stop-color="${COLORS.walnutDeep}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${COLORS.walnutDeep}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Soft fade so the editorial column always reads against the photo -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- Eyebrow -->
  <text x="${X}" y="${TOP}"
        font-family="JetBrains Mono, Menlo, Monaco, monospace"
        font-size="18"
        letter-spacing="4"
        fill="${COLORS.gold}">${escapeXml(eyebrow)}</text>

  <!-- Top rule -->
  <line x1="${X}" y1="${RULE_TOP}" x2="${X + 80}" y2="${RULE_TOP}" stroke="${COLORS.gold}" stroke-width="1"/>

  <!-- Name (Petrona display) -->
  ${nameLines
    .map((line, idx) => `<text x="${X}" y="${NAME_TOP + idx * NAME_LH}"
        font-family="Petrona, Georgia, serif"
        font-weight="500"
        font-size="56"
        fill="${COLORS.cream}">${escapeXml(line)}</text>`)
    .join('\n  ')}

  <!-- Brand · reference -->
  ${meta ? `<text x="${X}" y="${META_TOP + 24}"
        font-family="Spectral, Georgia, serif"
        font-style="italic"
        font-size="22"
        fill="${COLORS.cream80}">${escapeXml(meta)}</text>` : ''}

  <!-- Bottom rule -->
  <line x1="${X}" y1="${RULE_BOTTOM}" x2="${X + COL_W}" y2="${RULE_BOTTOM}" stroke="${COLORS.gold}" stroke-opacity="0.35" stroke-width="1"/>

  <!-- Price / placed line -->
  <text x="${X}" y="${PRICE_TOP + 24}"
        font-family="Petrona, Georgia, serif"
        font-style="italic"
        font-weight="500"
        font-size="42"
        fill="${COLORS.gold}">${escapeXml(priceText)}</text>

  <!-- Footer mark -->
  <text x="${X}" y="${H - 56}"
        font-family="JetBrains Mono, Menlo, Monaco, monospace"
        font-size="14"
        letter-spacing="3"
        fill="${COLORS.cream60}">${escapeXml(isSold ? 'ARCHIVED · SOLD' : 'AVAILABLE NOW')}</text>
</svg>`;
}

async function generateForWatch(watch) {
  const slug = String(watch.slug || '').trim();
  if (!slug) {
    console.warn(`OG: skipping watch without slug: ${watch.id}`);
    return false;
  }

  const photoPath = resolveWatchImage(watch);
  if (!photoPath) {
    console.warn(`OG: ${slug} — no source PNG found, skipping`);
    return false;
  }

  // Lay the photo on the right half, contained, with a soft drop shadow.
  const photoBuffer = await sharp(photoPath)
    .resize({
      width: 700,
      height: H - 80,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const svg = buildEditorialSvg(watch);

  const output = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: COLORS.walnutDeep,
    },
  })
    .composite([
      // Photo on the right with mild lift.
      { input: photoBuffer, left: W - 740, top: 40 },
      // Editorial SVG over the top so it overlaps the photo's left edge for
      // that "ledger sleeve over a portrait" feel.
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const outPath = path.join(ogOutDir, `${slug}.jpg`);
  await sharp(output).toFile(outPath);
  return true;
}

async function main() {
  if (!existsSync(inventoryPath)) fail(`inventory not found at ${inventoryPath}`);
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
  if (watches.length === 0) fail('inventory has no watches; nothing to render');

  mkdirSync(ogOutDir, { recursive: true });

  let ok = 0;
  let skipped = 0;
  for (const watch of watches) {
    try {
      const wrote = await generateForWatch(watch);
      if (wrote) ok += 1; else skipped += 1;
    } catch (error) {
      console.error(`OG: ${watch.slug} failed:`, error.message);
      skipped += 1;
    }
  }
  console.log(`OG cards generated: ${ok} written, ${skipped} skipped (out of ${watches.length}).`);
}

main();
