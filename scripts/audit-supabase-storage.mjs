import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = path.join(process.cwd(), ".env.local");

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

  const key = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  return key || null;
}

function extractMarkdownImageUrls(markdown) {
  if (!markdown || typeof markdown !== "string") return [];
  const urls = [];
  const regex = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = regex.exec(markdown))) {
    urls.push(match[1]);
  }
  return urls;
}

async function collectReferencedStorageKeys(client, supabaseUrl) {
  const referenced = new Set();
  const warnings = [];

  const { data: watches, error: watchesError } = await client
    .from("watches")
    .select("primary_image, images");
  if (watchesError) throw new Error(`Failed to read watch image refs: ${watchesError.message}`);

  for (const watch of watches ?? []) {
    const urls = [watch.primary_image, ...(Array.isArray(watch.images) ? watch.images : [])];
    for (const url of urls) {
      const key = storageKeyFromUrl(url, supabaseUrl);
      if (key) referenced.add(key);
    }
  }

  const { data: posts, error: postsError } = await client
    .from("journal_posts")
    .select("hero_image, body_markdown");
  if (postsError) {
    warnings.push(`Skipped journal image refs: ${postsError.message}`);
  } else {
    for (const post of posts ?? []) {
      const urls = [post.hero_image, ...extractMarkdownImageUrls(post.body_markdown)];
      for (const url of urls) {
        const key = storageKeyFromUrl(url, supabaseUrl);
        if (key) referenced.add(key);
      }
    }
  }

  return { referenced, warnings };
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

  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  if (bucketError) throw bucketError;

  const summaries = [];
  const allObjects = [];
  const { referenced, warnings } = await collectReferencedStorageKeys(client, url);

  for (const bucket of buckets ?? []) {
    const objects = await listObjectsRecursive(client, bucket.name);
    allObjects.push(...objects);
    const totalBytes = objects.reduce((sum, object) => sum + object.size, 0);

    summaries.push({
      bucket: bucket.name,
      public: bucket.public,
      fileSizeLimitMb: bucket.file_size_limit ? bytesToMb(bucket.file_size_limit) : null,
      files: objects.length,
      totalMb: bytesToMb(totalBytes),
    });
  }

  const largest = allObjects
    .slice()
    .sort((a, b) => b.size - a.size)
    .slice(0, 25)
    .map((object) => ({
      bucket: object.bucket,
      mb: bytesToMb(object.size),
      contentType: object.contentType,
      updatedAt: object.updatedAt,
      name: object.name,
    }));

  const orphanObjects = allObjects.filter((object) => !referenced.has(`${object.bucket}/${object.name}`));
  const objectKeys = new Set(allObjects.map((object) => `${object.bucket}/${object.name}`));
  const missingReferencedFiles = Array.from(referenced)
    .filter((key) => !objectKeys.has(key))
    .sort();
  const orphanSummaries = [];
  for (const bucket of buckets ?? []) {
    const objects = orphanObjects.filter((object) => object.bucket === bucket.name);
    const totalBytes = objects.reduce((sum, object) => sum + object.size, 0);
    orphanSummaries.push({
      bucket: bucket.name,
      files: objects.length,
      totalMb: bytesToMb(totalBytes),
    });
  }

  const largestOrphans = orphanObjects
    .slice()
    .sort((a, b) => b.size - a.size)
    .slice(0, 25)
    .map((object) => ({
      bucket: object.bucket,
      mb: bytesToMb(object.size),
      contentType: object.contentType,
      updatedAt: object.updatedAt,
      name: object.name,
    }));

  console.log(JSON.stringify({
    summaries,
    warnings,
    referencedFiles: referenced.size,
    missingReferencedFiles: missingReferencedFiles.length,
    missingReferencedSample: missingReferencedFiles.slice(0, 25),
    orphanSummaries,
    largest,
    largestOrphans,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
