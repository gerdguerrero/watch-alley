import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const ENV_PATH = path.join(process.cwd(), ".env.local");
const DEFAULT_MAX_EDGE = 1800;
const DEFAULT_QUALITY = 76;
const DEFAULT_MIN_BYTES = 700 * 1024;

function parseArgs(argv) {
  const args = {
    apply: false,
    limit: Number.POSITIVE_INFINITY,
    maxEdge: DEFAULT_MAX_EDGE,
    quality: DEFAULT_QUALITY,
    minBytes: DEFAULT_MIN_BYTES,
    largestFirst: false,
    skipUpdatedAfter: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? args.limit);
    else if (arg === "--max-edge") args.maxEdge = Number(argv[++i] ?? args.maxEdge);
    else if (arg === "--quality") args.quality = Number(argv[++i] ?? args.quality);
    else if (arg === "--min-kb") args.minBytes = Number(argv[++i] ?? args.minBytes / 1024) * 1024;
    else if (arg === "--largest-first") args.largestFirst = true;
    else if (arg === "--skip-updated-after") args.skipUpdatedAfter = new Date(argv[++i]).toISOString();
    else if (arg === "--help") {
      console.log(`
Compress referenced Watch Alley watch photos in place.

Usage:
  node scripts/compress-supabase-watch-images.mjs [--apply] [--limit 20]

Options:
  --apply          Upload compressed files back to the same Storage paths.
  --limit N        Process at most N referenced objects.
  --max-edge N     Resize longest edge to N pixels. Default ${DEFAULT_MAX_EDGE}.
  --quality N      WebP quality passed to sharp. Default ${DEFAULT_QUALITY}.
  --min-kb N       Skip objects smaller than N KB. Default ${DEFAULT_MIN_BYTES / 1024}.
  --largest-first  Inspect refs first and process biggest objects first.
  --skip-updated-after ISO
                   Skip objects updated at or after this timestamp.
`);
      process.exit(0);
    }
  }

  return args;
}

async function loadEnvFile(filePath) {
  try {
    const lines = (await fs.readFile(filePath, "utf8")).split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function bytesToMb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function storageKeyFromUrl(value, supabaseUrl) {
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

  return {
    bucket: key.slice(0, slashIndex),
    path: key.slice(slashIndex + 1),
  };
}

async function collectReferencedWatchObjects(client, supabaseUrl) {
  const { data, error } = await client.from("watches").select("id, slug, primary_image, images");
  if (error) throw new Error(`Failed to read public watch image refs: ${error.message}`);

  const refs = new Map();
  for (const watch of data ?? []) {
    const urls = [watch.primary_image, ...(Array.isArray(watch.images) ? watch.images : [])];
    for (const url of urls) {
      const key = storageKeyFromUrl(url, supabaseUrl);
      if (!key || key.bucket !== "watches") continue;
      const id = `${key.bucket}/${key.path}`;
      const existing = refs.get(id) ?? { ...key, watches: new Set() };
      existing.watches.add(watch.slug || watch.id || "unknown");
      refs.set(id, existing);
    }
  }

  return Array.from(refs.values()).map((ref) => ({
    bucket: ref.bucket,
    path: ref.path,
    watches: Array.from(ref.watches),
  }));
}

async function getObjectMetadata(client, bucket, objectPath) {
  const parent = objectPath.includes("/") ? objectPath.slice(0, objectPath.lastIndexOf("/")) : "";
  const name = objectPath.includes("/") ? objectPath.slice(objectPath.lastIndexOf("/") + 1) : objectPath;
  const { data, error } = await client.storage.from(bucket).list(parent, {
    limit: 100,
    search: name,
  });
  if (error) throw error;
  const entry = (data ?? []).find((item) => item.name === name);
  if (!entry) return null;
  return {
    size: Number(entry.metadata?.size ?? 0),
    contentType: entry.metadata?.mimetype ?? entry.metadata?.contentType ?? "",
    updatedAt: entry.updated_at,
  };
}

async function listObjectsRecursive(client, bucket, prefix = "") {
  const objects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;

    const entries = data ?? [];
    for (const entry of entries) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const size = Number(entry.metadata?.size ?? 0);
      if (entry.id || size > 0) {
        objects.push({
          path: objectPath,
          size,
          contentType: entry.metadata?.mimetype ?? entry.metadata?.contentType ?? "",
          updatedAt: entry.updated_at,
        });
      } else {
        objects.push(...(await listObjectsRecursive(client, bucket, objectPath)));
      }
    }

    if (entries.length < limit) break;
    offset += limit;
  }

  return objects;
}

async function attachMetadata(client, refs) {
  const bucketNames = Array.from(new Set(refs.map((ref) => ref.bucket)));
  const metadataByBucket = new Map();

  for (const bucket of bucketNames) {
    console.log(`listing bucket metadata: ${bucket}`);
    const objects = await listObjectsRecursive(client, bucket);
    metadataByBucket.set(bucket, new Map(objects.map((object) => [object.path, object])));
  }

  for (const ref of refs) {
    const metadata = metadataByBucket.get(ref.bucket)?.get(ref.path) ?? null;
    ref.metadata = metadata;
  }

  return refs;
}

async function processObject(client, ref, options) {
  const metadata = ref.metadata ?? (await getObjectMetadata(client, ref.bucket, ref.path));
  if (!metadata) return { status: "missing", ref };
  if (options.skipUpdatedAfter && metadata.updatedAt && metadata.updatedAt >= options.skipUpdatedAfter) {
    return { status: "skipped-recent", ref, beforeBytes: metadata.size };
  }
  if (metadata.size < options.minBytes) {
    return { status: "skipped-small", ref, beforeBytes: metadata.size };
  }
  if (!metadata.contentType.startsWith("image/")) {
    return { status: "skipped-type", ref, beforeBytes: metadata.size, contentType: metadata.contentType };
  }

  const { data: blob, error: downloadError } = await client.storage.from(ref.bucket).download(ref.path);
  if (downloadError) throw new Error(`${ref.bucket}/${ref.path}: ${downloadError.message}`);

  const input = Buffer.from(await blob.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize(options.maxEdge, options.maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: options.quality })
    .toBuffer();

  if (output.length >= metadata.size) {
    return {
      status: "skipped-not-smaller",
      ref,
      beforeBytes: metadata.size,
      afterBytes: output.length,
      savedBytes: 0,
    };
  }

  if (options.apply) {
    const { error: uploadError } = await client.storage.from(ref.bucket).upload(ref.path, output, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: true,
    });
    if (uploadError) throw new Error(`${ref.bucket}/${ref.path}: ${uploadError.message}`);
  }

  return {
    status: options.apply ? "compressed" : "would-compress",
    ref,
    beforeBytes: metadata.size,
    afterBytes: output.length,
    savedBytes: metadata.size - output.length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadEnvFile(ENV_PATH);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  }

  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let refs = await collectReferencedWatchObjects(client, supabaseUrl);
  if (options.largestFirst) {
    refs = await attachMetadata(client, refs);
    refs = refs
      .filter((ref) => ref.metadata && ref.metadata.size >= options.minBytes)
      .sort((a, b) => b.metadata.size - a.metadata.size);
  }
  refs = refs.slice(0, options.limit);

  const summary = {
    mode: options.apply ? "apply" : "dry-run",
    processed: 0,
    compressed: 0,
    skipped: 0,
    failed: 0,
    beforeMb: 0,
    afterMb: 0,
    savedMb: 0,
    recentResults: [],
    results: [],
  };

  for (const ref of refs) {
    summary.processed += 1;
    try {
      const result = await processObject(client, ref, options);
      if (result.beforeBytes) summary.beforeMb += bytesToMb(result.beforeBytes);
      if (result.afterBytes) summary.afterMb += bytesToMb(result.afterBytes);
      if (result.savedBytes) summary.savedMb += bytesToMb(result.savedBytes);
      if (result.status === "compressed" || result.status === "would-compress") summary.compressed += 1;
      else summary.skipped += 1;
      const compactResult = {
        status: result.status,
        bucket: ref.bucket,
        path: ref.path,
        beforeMb: result.beforeBytes ? bytesToMb(result.beforeBytes) : undefined,
        afterMb: result.afterBytes ? bytesToMb(result.afterBytes) : undefined,
        savedMb: result.savedBytes ? bytesToMb(result.savedBytes) : undefined,
        watches: ref.watches.slice(0, 3),
      };
      summary.recentResults.push(compactResult);
      if (summary.recentResults.length > 25) summary.recentResults.shift();
      console.log(
        `${summary.processed}/${refs.length} ${result.status} ${ref.bucket}/${ref.path}` +
          (result.savedBytes ? ` saved ${bytesToMb(result.savedBytes)} MB` : "")
      );
    } catch (error) {
      summary.failed += 1;
      summary.recentResults.push({
        status: "failed",
        bucket: ref.bucket,
        path: ref.path,
        error: error.message || String(error),
      });
      if (summary.recentResults.length > 25) summary.recentResults.shift();
      console.error(`${summary.processed}/${refs.length} failed ${ref.bucket}/${ref.path}: ${error.message || error}`);
    }
  }

  summary.beforeMb = Math.round(summary.beforeMb * 100) / 100;
  summary.afterMb = Math.round(summary.afterMb * 100) / 100;
  summary.savedMb = Math.round(summary.savedMb * 100) / 100;
  delete summary.results;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
