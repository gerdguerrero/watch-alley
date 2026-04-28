#!/usr/bin/env node
// Watch Alley image optimizer.
// Reads every PNG/JPG under public/watch-assets/ and emits AVIF + WebP variants
// at 1600w and 800w alongside the source so we can serve responsive next-gen
// formats via <picture> + srcset while keeping the original raster as a
// final fallback. AVIF is offered first (best compression on modern devices),
// WebP second (broad support), raster third (universal).

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'public', 'watch-assets');

const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const variants = [
  // AVIF: best compression. effort=4 balances encode time vs filesize.
  { suffix: '-1600.avif', width: 1600, encoder: 'avif', quality: 50, effort: 4 },
  { suffix: '-800.avif', width: 800, encoder: 'avif', quality: 50, effort: 4 },
  // WebP: broad support fallback. Higher quality numbers since cost is lower.
  { suffix: '-1600.webp', width: 1600, encoder: 'webp', quality: 78 },
  { suffix: '-800.webp', width: 800, encoder: 'webp', quality: 76 },
];

const files = readdirSync(assetsDir)
  .filter((file) => sourceExtensions.has(path.extname(file).toLowerCase()))
  .sort();

let written = 0;
let bytesIn = 0;
let bytesOut = 0;
const byEncoder = new Map();

for (const file of files) {
  const src = path.join(assetsDir, file);
  const baseName = path.basename(file, path.extname(file));
  bytesIn += statSync(src).size;

  for (const variant of variants) {
    const outPath = path.join(assetsDir, `${baseName}${variant.suffix}`);
    let pipeline = sharp(src).resize({ width: variant.width, withoutEnlargement: true });
    if (variant.encoder === 'avif') {
      pipeline = pipeline.avif({ quality: variant.quality, effort: variant.effort });
    } else {
      pipeline = pipeline.webp({ quality: variant.quality });
    }
    await pipeline.toFile(outPath);
    const size = statSync(outPath).size;
    bytesOut += size;
    written += 1;
    byEncoder.set(variant.encoder, (byEncoder.get(variant.encoder) || 0) + size);
    process.stdout.write(`✓ ${path.relative(projectRoot, outPath)}\n`);
  }
}

const fmt = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(`\nWrote ${written} variants from ${files.length} sources.`);
console.log(`Source raster total: ${fmt(bytesIn)}`);
for (const [encoder, total] of byEncoder) {
  console.log(`  ${encoder.padEnd(4)} total: ${fmt(total)} (${((total / bytesIn) * 100).toFixed(1)}% of source)`);
}
console.log(`All variants total: ${fmt(bytesOut)} (${((bytesOut / bytesIn) * 100).toFixed(1)}% of source).`);
