#!/usr/bin/env node
// Watch Alley inventory sync.
//
// Source of truth: Supabase table `watch_alley.watches`.
// This script reads every row, transforms it back to the camelCase JSON shape
// the homepage already understands, and overwrites `public/data/watches.json`.
//
// Usage:
//   pnpm sync:watches                  # uses anon key (read-only)
//   pnpm sync:watches --service-role   # uses service role key (bypasses RLS)
//
// Required env in .env.local:
//   WATCH_ALLEY_SUPABASE_URL
//   WATCH_ALLEY_SUPABASE_ANON_KEY              (default)
//   WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY      (only when --service-role)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outPath = path.join(projectRoot, 'public', 'data', 'watches.json');

// Lightweight .env.local loader (no dependency).
function loadEnv() {
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    const fullPath = path.join(projectRoot, file);
    if (!existsSync(fullPath)) continue;
    const raw = readFileSync(fullPath, 'utf8');
    for (const rawLine of raw.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnv();

const useServiceRole = process.argv.includes('--service-role');
const supabaseUrl = process.env.WATCH_ALLEY_SUPABASE_URL;
const supabaseKey = useServiceRole
  ? process.env.WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY
  : process.env.WATCH_ALLEY_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Sync failed: WATCH_ALLEY_SUPABASE_URL is not set. See .env.example.');
  process.exit(1);
}
if (!supabaseKey) {
  console.error(`Sync failed: ${useServiceRole ? 'WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY' : 'WATCH_ALLEY_SUPABASE_ANON_KEY'} is not set. See .env.example.`);
  process.exit(1);
}

// Use the PostgREST endpoint directly; avoids adding @supabase/supabase-js as a dep.
const endpoint = new URL('/rest/v1/watches', supabaseUrl);
endpoint.searchParams.set('select', '*');
// Active drops first (status != sold), then sold listings, both ordered by display_order.
endpoint.searchParams.set('order', 'status.asc,display_order.asc');

const response = await fetch(endpoint, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: 'application/json',
  },
});

if (!response.ok) {
  const body = await response.text().catch(() => '');
  console.error(`Sync failed: Supabase responded ${response.status} ${response.statusText}.`);
  if (body) console.error(body.slice(0, 400));
  process.exit(1);
}

const rows = await response.json();
if (!Array.isArray(rows)) {
  console.error('Sync failed: expected array of rows, got', typeof rows);
  process.exit(1);
}
if (rows.length === 0) {
  console.error('Sync failed: Supabase returned zero watches. Refusing to overwrite local JSON.');
  process.exit(1);
}

function toCamel(row) {
  const watch = {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    reference: row.reference,
    name: row.name,
    price: row.price,
    currency: row.currency,
    status: row.status,
    conditionLabel: row.condition_label,
    badge: row.badge,
    movement: row.movement,
    caseSize: row.case_size,
    set: row.inclusion_set,
    material: row.material,
    edition: row.edition,
    description: row.description,
    disclosure: row.disclosure,
    primaryImage: row.primary_image,
    images: row.images,
    inquirySubject: row.inquiry_subject,
    inquiryBody: row.inquiry_body,
  };
  if (row.sold_at) watch.soldAt = row.sold_at;
  if (row.sold_price !== null && row.sold_price !== undefined) watch.soldPrice = row.sold_price;
  if (row.has_box !== null && row.has_box !== undefined) watch.hasBox = row.has_box;
  if (row.has_papers !== null && row.has_papers !== undefined) watch.hasPapers = row.has_papers;
  if (row.service_history) watch.serviceHistory = row.service_history;
  if (row.featured) watch.featured = true;
  if (row.low_stock) watch.lowStock = true;
  return watch;
}

const watches = rows.map(toCamel);

const inventoryEnvelope = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  currency: 'PHP',
  inquiryEmail: 'hello@watchalley.ph',
  watches,
};

const json = JSON.stringify(inventoryEnvelope, null, 2) + '\n';
writeFileSync(outPath, json);

const available = watches.filter((w) => w.status === 'available').length;
const sold = watches.filter((w) => w.status === 'sold').length;
console.log(`Synced ${watches.length} watches from Supabase -> ${path.relative(projectRoot, outPath)} (${available} available, ${sold} sold).`);
