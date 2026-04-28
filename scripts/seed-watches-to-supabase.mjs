#!/usr/bin/env node
// One-shot seeder: pushes every row from public/data/watches.json into the
// watch_alley.watches table on the live Supabase project.
//
// Idempotent. Re-running is safe (uses Prefer: resolution=merge-duplicates so
// every row is upserted by primary key).
//
// Requires the service role key — RLS write paths are deliberately closed off,
// and this script intentionally bypasses RLS to seed inventory.
//
// Usage:
//   pnpm seed:watches
//
// Required env (in .env.local):
//   WATCH_ALLEY_SUPABASE_URL
//   WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
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

const supabaseUrl = process.env.WATCH_ALLEY_SUPABASE_URL;
const serviceRoleKey = process.env.WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR-NEW-PROJECT-REF')) {
  console.error('Seed failed: WATCH_ALLEY_SUPABASE_URL is missing or still a placeholder. See .env.example.');
  process.exit(1);
}
if (!serviceRoleKey || serviceRoleKey.length < 10) {
  console.error('Seed failed: WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY is missing. See .env.example.');
  process.exit(1);
}

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
if (watches.length === 0) {
  console.error('Seed failed: public/data/watches.json has no watches.');
  process.exit(1);
}

function toRow(w, index) {
  return {
    id: w.id,
    slug: w.slug,
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    name: w.name,
    price: w.price,
    currency: w.currency || 'PHP',
    status: w.status,
    condition_label: w.conditionLabel,
    badge: w.badge,
    movement: w.movement,
    case_size: w.caseSize,
    inclusion_set: w.set,
    material: w.material,
    edition: w.edition,
    description: w.description,
    disclosure: w.disclosure,
    primary_image: w.primaryImage,
    images: Array.isArray(w.images) ? w.images : [w.primaryImage],
    inquiry_subject: w.inquirySubject,
    inquiry_body: w.inquiryBody,
    sold_at: w.soldAt ?? null,
    sold_price: w.soldPrice ?? null,
    has_box: w.hasBox ?? null,
    has_papers: w.hasPapers ?? null,
    service_history: w.serviceHistory ?? null,
    featured: w.featured === true,
    low_stock: w.lowStock === true,
    display_order: typeof w.displayOrder === 'number' ? w.displayOrder : index,
  };
}

const rows = watches.map(toRow);

const endpoint = new URL('/rest/v1/watches', supabaseUrl);

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Content-Profile': 'watch_alley',
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(rows),
});

if (!response.ok) {
  const body = await response.text().catch(() => '');
  console.error(`Seed failed: Supabase responded ${response.status} ${response.statusText}.`);
  if (body) console.error(body.slice(0, 1200));
  process.exit(1);
}

const inserted = await response.json().catch(() => []);
const count = Array.isArray(inserted) ? inserted.length : 0;
const available = rows.filter((r) => r.status === 'available').length;
const sold = rows.filter((r) => r.status === 'sold').length;
console.log(`Seeded ${count} watches into watch_alley.watches (${available} available, ${sold} sold).`);
