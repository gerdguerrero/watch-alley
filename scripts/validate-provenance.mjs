// Provenance contract validator (Wave 1 of Bet 1).
//
// Locks down the provenance story field that turns spec sheets into records:
// - Migration 0010 is checked in.
// - public.watches view + admin_upsert_watch include the column.
// - Storefront pulls provenance, maps it, and renders the editorial panel.
// - Admin form has a textarea + load/save wiring for it.
// - At least one watch in the JSON fallback has a provenance story so the
//   storefront never renders an empty block on first cold load.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const indexHtml = readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');
const migration = readFileSync(
  path.join(projectRoot, 'docs', 'migrations', '0010-watch-alley-provenance.sql'),
  'utf8'
);
const inventory = JSON.parse(
  readFileSync(path.join(projectRoot, 'public', 'data', 'watches.json'), 'utf8')
);
const supabaseTypes = readFileSync(path.join(projectRoot, 'types', 'supabase.ts'), 'utf8');

function fail(message) {
  console.error(`Provenance contract validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ── Migration ───────────────────────────────────────────────────────
assert(
  /alter table watch_alley\.watches\s+add column if not exists provenance text/i.test(migration),
  'migration 0010 must add the provenance column'
);
assert(
  /drop view if exists public\.watches/i.test(migration),
  'migration 0010 must drop the existing public.watches view before recreating it'
);
assert(
  /create view public\.watches[\s\S]*provenance/i.test(migration),
  'migration 0010 must recreate public.watches with the provenance column'
);
assert(
  /create or replace function public\.admin_upsert_watch[\s\S]*provenance[\s\S]*excluded\.provenance/i.test(migration),
  'migration 0010 must update admin_upsert_watch to insert and update provenance from the payload'
);
assert(
  /nullif\(payload->>'provenance',\s*''\)/.test(migration),
  'admin_upsert_watch must coerce empty-string provenance to NULL'
);

// ── TypeScript types ───────────────────────────────────────────────
const typesProvenanceMatches = supabaseTypes.match(/provenance\??:\s*string\s*\|\s*null/g) || [];
assert(
  typesProvenanceMatches.length >= 3,
  'types/supabase.ts must expose provenance on Row, Insert, and Update for the watches view'
);

// ── Storefront ──────────────────────────────────────────────────────
assert(
  /PUBLIC_WATCH_COLUMNS\s*=\s*\[[\s\S]*'provenance'/.test(indexHtml),
  'storefront PUBLIC_WATCH_COLUMNS must include provenance'
);
assert(
  /provenance:\s*row\.provenance\s*\|\|\s*''/.test(indexHtml),
  'toWatchInventoryItem must map row.provenance into the watch object'
);
assert(
  /function renderProductProvenance\s*\(\s*provenance\s*\)/.test(indexHtml),
  'storefront must define renderProductProvenance(provenance)'
);
assert(
  /\$\{renderProductProvenance\(watch\.provenance\)\}/.test(indexHtml),
  'product detail modal must call renderProductProvenance(watch.provenance) between description and price'
);
assert(
  /class="product-modal-provenance"/.test(indexHtml),
  'storefront must render the .product-modal-provenance editorial panel'
);
assert(
  /\.product-modal-provenance\s*\{[\s\S]*border-top:\s*1px\s+solid\s+var\(--gold-20\)/.test(indexHtml),
  '.product-modal-provenance must use a thin gold rule (no side stripe)'
);
// Confirm the provenance block itself doesn't carry a banned side-stripe.
const provenanceRule = indexHtml.match(/\.product-modal-provenance\s*\{[^}]*\}/);
assert(provenanceRule, 'expected a .product-modal-provenance CSS rule block');
assert(
  !/border-left:\s*\d/.test(provenanceRule[0]),
  '.product-modal-provenance must not use border-left stripes (project ban)'
);
assert(
  /\.product-modal-provenance-eyebrow/.test(indexHtml),
  'provenance panel must include a .mono eyebrow ("From the bench")'
);

// ── Admin form ──────────────────────────────────────────────────────
assert(
  /id="field-provenance"/.test(adminHtml),
  'admin form must include a textarea with id="field-provenance"'
);
assert(
  /<textarea id="field-provenance"/.test(adminHtml),
  'admin provenance field must be a textarea, not an input'
);
assert(
  /setField\('provenance',\s*watch\?\.provenance\s*\|\|\s*''\)/.test(adminJs),
  'admin.js must hydrate the provenance field from watch?.provenance'
);
assert(
  /provenance:\s*getField\('provenance'\)\.trim\(\)\s*\|\|\s*null/.test(adminJs),
  'admin.js must include provenance in the upsert payload (empty string coerced to null)'
);

// ── JSON fallback seed ──────────────────────────────────────────────
const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
const seeded = watches.filter((w) => typeof w.provenance === 'string' && w.provenance.trim().length > 40);
assert(
  seeded.length >= 2,
  'public/data/watches.json must seed provenance copy on at least 2 watches so the storefront never renders an empty block on first cold load'
);

console.log(`Provenance contract valid: migration, types, storefront, admin, and ${seeded.length} seeded fallback stories.`);
