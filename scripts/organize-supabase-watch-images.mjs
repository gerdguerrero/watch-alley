import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = path.join(process.cwd(), ".env.local");
const MANIFEST_DIR = path.join(process.cwd(), ".storage-cleanup");
const WATCHES_BUCKET = "watches";

function parseArgs(argv) {
  const args = {
    apply: false,
    deleteOld: false,
    limit: Number.POSITIVE_INFINITY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--delete-old") args.deleteOld = true;
    else if (arg === "--limit") args.limit = Number(argv[++index] ?? args.limit);
    else if (arg === "--help") {
      console.log(`
Organize referenced watch photos into watches/<watch-slug>/ folders.

Usage:
  node scripts/organize-supabase-watch-images.mjs [--apply] [--delete-old] [--limit 10]

Options:
  --apply       Copy files to canonical slug folders and update watch records.
  --delete-old  After successful updates, remove old referenced paths that are no
                longer referenced by any watch record.
  --limit N     Process at most N copy operations.
`);
      process.exit(0);
    }
  }

  return args;
}

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

function storageObjectFromUrl(value, supabaseUrl) {
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

function folderName(objectPath) {
  const slashIndex = objectPath.indexOf("/");
  return slashIndex === -1 ? "" : objectPath.slice(0, slashIndex);
}

function destinationFor(slug, sourcePath, reservedPaths) {
  const parsed = path.posix.parse(sourcePath);
  const baseName = parsed.base.replace(/[^a-zA-Z0-9._-]+/g, "-") || "image.jpg";
  const firstChoice = `${slug}/${baseName}`;
  if (!reservedPaths.has(firstChoice) || firstChoice === sourcePath) {
    reservedPaths.add(firstChoice);
    return firstChoice;
  }

  const ext = parsed.ext || "";
  const stem = (baseName.slice(0, baseName.length - ext.length) || "image").replace(/-+$/g, "");
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${slug}/${stem}-${index}${ext}`;
    if (!reservedPaths.has(candidate) || candidate === sourcePath) {
      reservedPaths.add(candidate);
      return candidate;
    }
  }

  throw new Error(`Could not find a free destination for ${sourcePath}`);
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(Array.from(counts.entries()).sort((a, b) => b[1] - a[1]));
}

function publicUrl(client, objectPath) {
  const { data } = client.storage.from(WATCHES_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function buildManifestPath(kind) {
  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(MANIFEST_DIR, `${stamp}-${kind}.json`);
}

async function copyObject(client, sourcePath, destinationPath) {
  const { error } = await client.storage.from(WATCHES_BUCKET).copy(sourcePath, destinationPath);
  if (error) throw new Error(`${sourcePath} -> ${destinationPath}: ${error.message}`);
}

async function removeObjects(client, paths) {
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

    const confirmed = new Set((data ?? []).map((object) => object.name));
    removed.push(...batch.filter((name) => confirmed.has(name)));
    failed.push(...batch
      .filter((name) => !confirmed.has(name))
      .map((name) => ({ name, error: "Storage API did not confirm deletion." })));
  }

  return { removed, failed };
}

function imageUrlsForWatch(watch) {
  return [watch.primary_image, ...(Array.isArray(watch.images) ? watch.images : [])].filter(Boolean);
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

  const { data: watches, error: watchesError } = await client
    .from("watches")
    .select("id, slug, primary_image, images");
  if (watchesError) throw new Error(`Failed to read watch image refs: ${watchesError.message}`);

  const objects = await listObjectsRecursive(client, WATCHES_BUCKET);
  const objectByPath = new Map(objects.map((object) => [object.name, object]));
  const referencedPaths = new Set();
  const sourceRefCounts = new Map();
  const reservedPaths = new Set(objects.map((object) => object.name));
  const operations = [];
  const replacementsByWatchId = new Map();

  for (const watch of watches ?? []) {
    if (!watch.id || !watch.slug) continue;
    const urls = imageUrlsForWatch(watch);
    const seenSourcesForWatch = new Map();

    for (const url of urls) {
      const object = storageObjectFromUrl(url, supabaseUrl);
      if (!object || object.bucket !== WATCHES_BUCKET) continue;

      referencedPaths.add(object.path);
      sourceRefCounts.set(object.path, (sourceRefCounts.get(object.path) ?? 0) + 1);
      if (folderName(object.path) === watch.slug) continue;

      let destinationPath = seenSourcesForWatch.get(object.path);
      if (!destinationPath) {
        destinationPath = destinationFor(watch.slug, object.path, reservedPaths);
        seenSourcesForWatch.set(object.path, destinationPath);
        operations.push({
          watchId: watch.id,
          watchSlug: watch.slug,
          fromPath: object.path,
          toPath: destinationPath,
          fromFolder: folderName(object.path) || "(root)",
          size: objectByPath.get(object.path)?.size ?? 0,
        });
      }

      const replacements = replacementsByWatchId.get(watch.id) ?? new Map();
      replacements.set(url, publicUrl(client, destinationPath));
      replacementsByWatchId.set(watch.id, replacements);
    }
  }

  const limitedOperations = operations.slice(0, args.limit);
  const limitedSources = new Set(limitedOperations.map((operation) => `${operation.watchId}:${operation.fromPath}`));
  const changedWatches = [];

  for (const watch of watches ?? []) {
    const replacements = replacementsByWatchId.get(watch.id);
    if (!replacements) continue;

    const activeReplacements = new Map(Array.from(replacements.entries()).filter(([oldUrl]) => {
      const object = storageObjectFromUrl(oldUrl, supabaseUrl);
      return object ? limitedSources.has(`${watch.id}:${object.path}`) : false;
    }));
    if (!activeReplacements.size) continue;

    const nextPrimaryImage = activeReplacements.get(watch.primary_image) ?? watch.primary_image;
    const nextImages = Array.isArray(watch.images)
      ? watch.images.map((url) => activeReplacements.get(url) ?? url)
      : watch.images;

    changedWatches.push({
      id: watch.id,
      slug: watch.slug,
      before: {
        primary_image: watch.primary_image,
        images: watch.images,
      },
      after: {
        primary_image: nextPrimaryImage,
        images: nextImages,
      },
    });
  }

  const sourcePathsToDelete = [];
  if (args.deleteOld) {
    const replacementOldPaths = new Set(limitedOperations.map((operation) => operation.fromPath));
    const allFinalReferenced = new Set();
    for (const watch of watches ?? []) {
      const changed = changedWatches.find((item) => item.id === watch.id);
      const urls = [changed?.after.primary_image ?? watch.primary_image, ...(Array.isArray(changed?.after.images ?? watch.images) ? (changed?.after.images ?? watch.images) : [])];
      for (const url of urls) {
        const object = storageObjectFromUrl(url, supabaseUrl);
        if (object?.bucket === WATCHES_BUCKET) allFinalReferenced.add(object.path);
      }
    }

    for (const sourcePath of replacementOldPaths) {
      if (!allFinalReferenced.has(sourcePath) && objectByPath.has(sourcePath)) {
        sourcePathsToDelete.push(sourcePath);
      }
    }
  }

  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    bucket: WATCHES_BUCKET,
    watchRows: watches?.length ?? 0,
    objectFiles: objects.length,
    referencedFiles: referencedPaths.size,
    alreadyCanonicalRefs: Array.from(referencedPaths).filter((objectPath) => {
      const refWatches = (watches ?? []).filter((watch) => imageUrlsForWatch(watch).some((url) => storageObjectFromUrl(url, supabaseUrl)?.path === objectPath));
      return refWatches.some((watch) => folderName(objectPath) === watch.slug);
    }).length,
    totalMoveCandidates: operations.length,
    plannedCopies: limitedOperations.length,
    plannedDbUpdates: changedWatches.length,
    plannedDeleteOldFiles: sourcePathsToDelete.length,
    plannedDeleteOldMb: bytesToMb(sourcePathsToDelete.reduce((sum, objectPath) => sum + (objectByPath.get(objectPath)?.size ?? 0), 0)),
    sourceFolders: countBy(operations, (operation) => operation.fromFolder),
    sampleOperations: limitedOperations.slice(0, 30).map((operation) => ({
      watchSlug: operation.watchSlug,
      fromPath: operation.fromPath,
      toPath: operation.toPath,
      mb: bytesToMb(operation.size),
    })),
  };

  if (!args.apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const manifestPath = buildManifestPath("watch-image-organization");
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    summary,
    operations: limitedOperations,
    changedWatches,
    sourcePathsToDelete,
  }, null, 2)}\n`);

  const currentWatches = new Map((watches ?? []).map((watch) => [watch.id, {
    id: watch.id,
    slug: watch.slug,
    primary_image: watch.primary_image,
    images: watch.images,
  }]));
  const copied = [];
  const copyFailures = [];
  const updated = [];
  const updateFailures = [];
  const deleted = { removed: [], failed: [] };

  for (const watch of changedWatches) {
    const watchOperations = limitedOperations.filter((operation) => operation.watchId === watch.id);
    const watchCopyFailures = [];

    for (const operation of watchOperations) {
      try {
        await copyObject(client, operation.fromPath, operation.toPath);
        copied.push(operation);
        console.log(`copied ${operation.fromPath} -> ${operation.toPath}`);
      } catch (error) {
        const failure = { ...operation, error: error.message };
        copyFailures.push(failure);
        watchCopyFailures.push(failure);
        console.error(`copy failed ${operation.fromPath}: ${error.message}`);
      }
    }

    if (watchCopyFailures.length > 0) continue;

    const { error } = await client
      .from("watches")
      .update({
        primary_image: watch.after.primary_image,
        images: watch.after.images,
      })
      .eq("id", watch.id);
    if (error) updateFailures.push({ id: watch.id, slug: watch.slug, error: error.message });
    else {
      updated.push({ id: watch.id, slug: watch.slug });
      currentWatches.set(watch.id, {
        id: watch.id,
        slug: watch.slug,
        primary_image: watch.after.primary_image,
        images: watch.after.images,
      });

      if (args.deleteOld) {
        const finalReferenced = new Set();
        for (const currentWatch of currentWatches.values()) {
          for (const url of imageUrlsForWatch(currentWatch)) {
            const object = storageObjectFromUrl(url, supabaseUrl);
            if (object?.bucket === WATCHES_BUCKET) finalReferenced.add(object.path);
          }
        }

        const oldPathsForWatch = Array.from(new Set(watchOperations.map((operation) => operation.fromPath)))
          .filter((oldPath) => !finalReferenced.has(oldPath))
          .filter((oldPath) => !deleted.removed.includes(oldPath));
        if (oldPathsForWatch.length > 0) {
          const removed = await removeObjects(client, oldPathsForWatch);
          deleted.removed.push(...removed.removed);
          deleted.failed.push(...removed.failed);
          for (const oldPath of removed.removed) console.log(`deleted old ${oldPath}`);
        }
      }
    }
  }

  console.log(JSON.stringify({
    ...summary,
    manifestPath,
    copiedFiles: copied.length,
    copyFailures,
    updatedWatches: updated.length,
    updateFailures,
    deletedOldFiles: deleted.removed.length,
    deleteFailures: deleted.failed,
  }, null, 2));

  if (updateFailures.length || deleted.failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
