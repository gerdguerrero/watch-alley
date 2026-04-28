#!/usr/bin/env node
// Watch Alley image optimizer.
// Reads every PNG/JPG under public/watch-assets/ and emits two WebP variants
// (1600w and 800w) alongside the source so we can serve responsive WebP via
// <picture> + srcset while keeping the original PNG as a fallback.

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'public', 'watch-assets');

const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const variants = [
  { suffix: '-1600.webp', width: 1600, quality: 78 },
  { suffix: '-800.webp', width: 800, quality: 76 },
];

const files = readdirSync(assetsDir)
  .filter((file) => sourceExtensions.has(path.extname(file).toLowerCase()))
  .filter((file) => !file.endsWith('.webp'))
  .sort();

let written = 0;
let bytesIn = 0;
let bytesOut = 0;

for (const file of files) {
  const src = path.join(assetsDir, file);
  const baseName = path.basename(file, path.extname(file));
  bytesIn += statSync(src).size;

  for (const variant of variants) {
    const outPath = path.join(assetsDir, `${baseName}${variant.suffix}`);
    await sharp(src)
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .toFile(outPath);
    bytesOut += statSync(outPath).size;
    written += 1;
    process.stdout.write(`✓ ${path.relative(projectRoot, outPath)}\n`);
  }
}

const fmt = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(`\nWrote ${written} WebP variants from ${files.length} sources.`);
console.log(`Source PNG total: ${fmt(bytesIn)}`);
console.log(`WebP variants total: ${fmt(bytesOut)} (${((bytesOut / bytesIn) * 100).toFixed(1)}% of source).`);
