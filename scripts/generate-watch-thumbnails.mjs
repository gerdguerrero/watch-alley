import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

/**
 * Generate small WebP thumbnails for every watch photo referenced by the
 * inventory, stored as a sibling object next to the original:
 *
 *   watches/<slug>/<name>.<ext>  ->  watches/<slug>/<name>.thumb.webp
 *
 * The storefront grids and gallery filmstrip render the thumbnail (see
 * src/lib/inventory/image.ts); detail/zoom views keep the full image. Dry-run
 * by default — pass --apply to write.
 *
 * Usage:
 *   node scripts/generate-watch-thumbnails.mjs [--apply] [--force] [--limit N]
 *
 *   --apply    Upload generated thumbnails (otherwise just report what's missing).
 *   --force    Regenerate even if a thumbnail already exists.
 *   --limit N  Process at most N source images.
 */

const ENV_PATH = path.join(process.cwd(), ".env.local");
const WATCHES_BUCKET = "watches";
const THUMB_SUFFIX = ".thumb.webp";
const THUMB_MAX_EDGE = 900;
const THUMB_QUALITY = 72;

function parseArgs(argv) {
  const args = { apply: false, force: false, limit: Number.POSITIVE_INFINITY };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? args.limit);
    else if (arg === "--help") {
      console.log(
        "Usage: node scripts/generate-watch-thumbnails.mjs [--apply] [--force] [--limit N]"
      );
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

/** Extract `watches/<path>` for a public object URL, or null if it isn't one. */
function storagePathFromUrl(value, supabaseUrl) {
  if (!value || typeof value !== "string") return null;
  let url;
  let expectedHost;
  try {
    url = new URL(value);
    expectedHost = new URL(supabaseUrl).host;
  } catch {
    return null;
  }
  if (url.host !== expectedHost) return null;
  const marker = "/storage/v1/object/public/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;
  const key = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  const slashIndex = key.indexOf("/");
  if (slashIndex === -1) return null;
  const bucket = key.slice(0, slashIndex);
  if (bucket !== WATCHES_BUCKET) return null;
  return key.slice(slashIndex + 1);
}

function thumbPathFor(objectPath) {
  return objectPath.replace(/\.[^./]+$/, THUMB_SUFFIX);
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

  const { data: watches, error } = await client
    .from("watches")
    .select("id, slug, primary_image, images");
  if (error) throw new Error(`Failed to read watch image refs: ${error.message}`);

  // Unique source object paths referenced by any watch, excluding thumbnails.
  const sources = new Set();
  for (const watch of watches ?? []) {
    const refs = [watch.primary_image, ...(Array.isArray(watch.images) ? watch.images : [])];
    for (const ref of refs) {
      const objectPath = storagePathFromUrl(ref, supabaseUrl);
      if (objectPath && !objectPath.endsWith(THUMB_SUFFIX)) sources.add(objectPath);
    }
  }

  const allSources = [...sources];
  console.log(
    `Found ${allSources.length} referenced source images.${args.apply ? "" : " (dry run — pass --apply to write)"}`
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const objectPath of allSources) {
    if (processed >= args.limit) break;
    const thumbPath = thumbPathFor(objectPath);

    try {
      if (!args.force) {
        // A HEAD-style existence check: list the folder and look for the thumb.
        const folder = thumbPath.slice(0, thumbPath.lastIndexOf("/"));
        const name = thumbPath.slice(thumbPath.lastIndexOf("/") + 1);
        const { data: existing } = await client.storage
          .from(WATCHES_BUCKET)
          .list(folder, { search: name, limit: 1 });
        if (existing?.some((e) => e.name === name)) {
          skipped += 1;
          continue;
        }
      }

      processed += 1;

      const { data: blob, error: dlError } = await client.storage
        .from(WATCHES_BUCKET)
        .download(objectPath);
      if (dlError || !blob) throw new Error(dlError?.message || "download failed");

      const inputBuffer = Buffer.from(await blob.arrayBuffer());
      const outputBuffer = await sharp(inputBuffer)
        .rotate() // honour EXIF orientation before stripping metadata
        .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();

      console.log(
        `  ${args.apply ? "✓" : "·"} ${thumbPath}  ${bytesToKb(inputBuffer.length)} → ${bytesToKb(outputBuffer.length)}`
      );

      if (args.apply) {
        const { error: upError } = await client.storage
          .from(WATCHES_BUCKET)
          .upload(thumbPath, outputBuffer, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          });
        if (upError) throw upError;
      }
      generated += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${objectPath}: ${err?.message || err}`);
    }
  }

  console.log(
    `\nDone. ${args.apply ? "generated" : "would generate"}: ${generated}, already present: ${skipped}, failed: ${failed}.`
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
