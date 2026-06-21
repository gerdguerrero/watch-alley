import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/**
 * Re-compress watch images that are stored as raw PNGs (named .webp but
 * actually PNG with wrong mime type). Matches the admin.js compression
 * pipeline: max 2200px edge, target ≤900 KB WebP, quality 0.82→0.62.
 *
 * Reads paths from scripts/recompress-list.json (a JSON array of storage paths).
 *
 * Usage:
 *   node scripts/recompress-watch-images.mjs [--apply] [--limit N]
 *
 *   --apply    Actually upload the compressed images (default: dry-run).
 *   --limit N  Process at most N images.
 */

const ENV_PATH = path.join(process.cwd(), ".env.local");
const LIST_PATH = path.join(process.cwd(), "scripts", "recompress-list-remaining.json");
const WATCHES_BUCKET = "watches";
const MAX_EDGE = 2200;
const TARGET_BYTES = 900 * 1024;
const MIN_QUALITY = 0.62;
const START_QUALITY = 0.82;

function parseArgs(argv) {
  const args = { apply: false, limit: Number.POSITIVE_INFINITY };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? args.limit);
    else if (arg === "--help") {
      console.log("Usage: node scripts/recompress-watch-images.mjs [--apply] [--limit N]");
      process.exit(0);
    }
  }
  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function bytesToKb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(ENV_PATH);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or service-role/secret key.");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Read the pre-computed list of paths
  if (!fs.existsSync(LIST_PATH)) {
    throw new Error(`Missing ${LIST_PATH}. Run the SQL query first.`);
  }
  const paths = JSON.parse(fs.readFileSync(LIST_PATH, "utf8"));
  console.log(`Loaded ${paths.length} images to re-compress.`);
  
  if (!args.apply) {
    console.log("DRY RUN — pass --apply to actually upload.\n");
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let totalSaved = 0;

  for (const objectPath of paths) {
    if (processed >= args.limit) break;
    processed += 1;

    console.log(`[${processed}/${Math.min(paths.length, args.limit)}] ${objectPath}`);

    try {
      // Download
      const { data: blob, error: dlErr } = await client.storage
        .from(WATCHES_BUCKET)
        .download(objectPath);
      if (dlErr || !blob) throw new Error(dlErr?.message || "download failed");

      const inputBuffer = Buffer.from(await blob.arrayBuffer());
      const inputSize = inputBuffer.length;

      // Get dimensions
      const metadata = await sharp(inputBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (!width || !height) throw new Error("Could not read image dimensions");

      // Scale to max 2200px edge (match admin.js)
      const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
      const outputWidth = Math.max(1, Math.round(width * scale));
      const outputHeight = Math.max(1, Math.round(height * scale));

      // Compress: try qualities from 0.82 down to 0.62
      let quality = START_QUALITY;
      let outputBuffer;
      while (quality >= MIN_QUALITY) {
        outputBuffer = await sharp(inputBuffer)
          .rotate()
          .resize(outputWidth, outputHeight, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: Math.round(quality * 100) })
          .toBuffer();
        if (outputBuffer.length <= TARGET_BYTES) break;
        quality -= 0.08;
      }

      const saved = inputSize - outputBuffer.length;
      totalSaved += saved;
      const pct = inputSize > 0 ? Math.round((saved / inputSize) * 100) : 0;

      console.log(
        `  ${args.apply ? "✓" : "·"} ${width}×${height} → ${outputWidth}×${outputHeight} | ${bytesToKb(inputSize)} → ${bytesToKb(outputBuffer.length)} (${pct}% saved) | q=${quality.toFixed(2)}`
      );

      if (args.apply) {
        const { error: upErr } = await client.storage
          .from(WATCHES_BUCKET)
          .upload(objectPath, outputBuffer, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          });
        if (upErr) throw upErr;
        console.log(`  ✓ Uploaded`);
      }
      succeeded += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${err?.message || err}`);
    }
  }

  console.log(`\nDone. ${args.apply ? "Re-compressed" : "Would re-compress"}: ${succeeded}, failed: ${failed}.`);
  if (totalSaved > 0) {
    console.log(`Total saved: ${bytesToKb(totalSaved)} (${Math.round(totalSaved / 1024 / 1024)} MB).`);
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
