import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = path.join(process.cwd(), ".env.local");
const MANIFEST_DIR = path.join(process.cwd(), ".storage-cleanup");
const APPLY = process.argv.includes("--apply");
const WATCHES_BUCKET = "watches";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function bytesToMb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function storageKeyFromUrl(value, supabaseUrl) {
  if (!value || typeof value !== "string") return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  let expectedHost = "";
  try {
    expectedHost = new URL(supabaseUrl).host;
  } catch {
    return null;
  }

  if (url.host !== expectedHost) return null;
  const marker = "/storage/v1/object/public/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) || null;
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

    if (error) {
      throw new Error(`${bucket}/${prefix || ""}: ${error.message}`);
    }

    const entries = data ?? [];
    for (const entry of entries) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const size = Number(entry.metadata?.size ?? 0);

      if (entry.id || size > 0) {
        objects.push({
          bucket,
          name: objectPath,
          size,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          contentType: entry.metadata?.mimetype ?? entry.metadata?.contentType ?? "",
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

async function collectReferencedWatchKeys(client, supabaseUrl) {
  const referenced = new Set();
  const { data, error } = await client.from("watches").select("primary_image, images");
  if (error) throw new Error(`Failed to read watch image refs: ${error.message}`);

  for (const watch of data ?? []) {
    const urls = [watch.primary_image, ...(Array.isArray(watch.images) ? watch.images : [])];
    for (const url of urls) {
      const key = storageKeyFromUrl(url, supabaseUrl);
      if (key) referenced.add(key);
    }
  }

  return referenced;
}

function writeManifest(payload) {
  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const manifestPath = path.join(MANIFEST_DIR, `${stamp}-watch-orphans.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
  return manifestPath;
}

async function removeInBatches(client, paths) {
  const removed = [];
  const failed = [];
  const batchSize = 100;

  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { data, error } = await client.storage.from(WATCHES_BUCKET).remove(batch);
    if (error) {
      failed.push(...batch.map((name) => ({ name, error: error.message })));
      continue;
    }

    const removedNames = new Set((data ?? []).map((object) => object.name));
    removed.push(...batch.filter((name) => removedNames.has(name)));
    failed.push(...batch
      .filter((name) => !removedNames.has(name))
      .map((name) => ({ name, error: "Storage API did not confirm deletion." })));
  }

  return { removed, failed };
}

async function main() {
  loadEnvFile(ENV_PATH);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or service-role/secret key.");
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const referenced = await collectReferencedWatchKeys(client, url);
  const objects = await listObjectsRecursive(client, WATCHES_BUCKET);
  const orphans = objects
    .filter((object) => !referenced.has(`${WATCHES_BUCKET}/${object.name}`))
    .sort((a, b) => b.size - a.size);

  const summary = {
    mode: APPLY ? "apply" : "dry-run",
    bucket: WATCHES_BUCKET,
    referencedFiles: referenced.size,
    orphanFiles: orphans.length,
    orphanMb: bytesToMb(orphans.reduce((sum, object) => sum + object.size, 0)),
    largestOrphans: orphans.slice(0, 25).map((object) => ({
      name: object.name,
      mb: bytesToMb(object.size),
      contentType: object.contentType,
      updatedAt: object.updatedAt,
    })),
  };

  if (!APPLY) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const manifestPath = writeManifest({
    createdAt: new Date().toISOString(),
    bucket: WATCHES_BUCKET,
    totalFiles: orphans.length,
    totalMb: summary.orphanMb,
    objects: orphans.map((object) => ({
      name: object.name,
      size: object.size,
      mb: bytesToMb(object.size),
      contentType: object.contentType,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
    })),
  });

  const { removed, failed } = await removeInBatches(client, orphans.map((object) => object.name));
  console.log(JSON.stringify({
    ...summary,
    manifestPath,
    removedFiles: removed.length,
    failedFiles: failed.length,
    failed,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
