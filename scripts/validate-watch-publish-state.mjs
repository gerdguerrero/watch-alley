// Watch published/draft state contract validator (Bet 3 Wave 2).
//
// Locks down the draft/published toggle so future edits don't accidentally:
//   • expose draft listings on the storefront
//   • drop the noindex/draft-banner injection in the build pipeline
//   • include drafts in dist/sitemap.xml
//   • break the admin's ability to see drafts (RLS now hides them from
//     authenticated readers; the admin UI must use admin_list_watches)
//   • lose the "Preview as buyer" affordance

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const migrationPath = path.join(projectRoot, 'docs', 'migrations', '0014-watch-alley-published-state.sql');
const indexHtml = readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');
const generator = readFileSync(path.join(projectRoot, 'scripts', 'generate-watch-pages.mjs'), 'utf8');
const supabaseTypes = readFileSync(path.join(projectRoot, 'types', 'supabase.ts'), 'utf8');

function fail(msg) {
  console.error(`Watch publish-state contract validation failed: ${msg}`);
  process.exit(1);
}
function assert(cond, msg) { if (!cond) fail(msg); }

// ── Migration ───────────────────────────────────────────────────────
assert(existsSync(migrationPath), 'docs/migrations/0014-watch-alley-published-state.sql must exist');
const migration = readFileSync(migrationPath, 'utf8');
assert(
  /add column if not exists published boolean not null default true/i.test(migration),
  'migration 0014 must add published boolean not null default true'
);
assert(
  /create policy "Public read access"\s+on watch_alley\.watches[\s\S]*?using\s*\(\s*published\s*=\s*true\s*\)/i.test(migration),
  'public read RLS must filter on published = true'
);
assert(
  /drop view if exists public\.watches[\s\S]*?create view public\.watches[\s\S]*?published[\s\S]*?from watch_alley\.watches/i.test(migration),
  'public.watches view must be recreated to expose the published column'
);
assert(
  /create or replace function public\.admin_upsert_watch[\s\S]*?coalesce\(\(payload->>'published'\)::boolean, true\)/i.test(migration),
  'admin_upsert_watch must persist payload.published (default true)'
);
assert(
  /create or replace function public\.admin_list_watches\(\)[\s\S]*?watch_alley\.is_admin\(\)/i.test(migration),
  'migration must create admin_list_watches RPC gated on is_admin()'
);
assert(
  /grant execute on function public\.admin_list_watches\(\) to authenticated/i.test(migration),
  'admin_list_watches must be executable by authenticated callers'
);

// ── Types ──────────────────────────────────────────────────────────
const publishedDecls = supabaseTypes.match(/published\??:\s*boolean\s*\|\s*null/g) || [];
assert(publishedDecls.length >= 3, 'types/supabase.ts must expose published on Row, Insert, and Update');

// ── Storefront mapper ──────────────────────────────────────────────
assert(
  /'published',?\s*\n\s*\]\.join\(','\)/.test(indexHtml),
  "PUBLIC_WATCH_COLUMNS must include 'published'"
);
assert(
  /watch\.published\s*=\s*row\.published\s*!==\s*false/.test(indexHtml),
  'toWatchInventoryItem must map row.published into the watch object'
);

// ── Admin form ─────────────────────────────────────────────────────
assert(
  /id="field-published"/.test(adminHtml),
  'admin form must include the Published checkbox (id="field-published")'
);
assert(
  /id="preview-as-buyer-btn"/.test(adminHtml),
  'admin form must include a Preview as buyer button'
);
assert(
  /setCheckbox\('published',\s*watch\?\.published\s*!==\s*false\)/.test(adminJs),
  'admin.js must hydrate the published checkbox (default true)'
);
assert(
  /published:\s*getCheckbox\('published'\)/.test(adminJs),
  'admin.js must include published in the upsert payload'
);
assert(
  /supabase\.rpc\(\s*['"]admin_list_watches['"]\s*\)/.test(adminJs),
  'admin.js must call admin_list_watches() (RLS now hides drafts from a direct .from("watches") select)'
);
assert(
  /preview-as-buyer-btn/.test(adminJs),
  'admin.js must wire the Preview-as-buyer button click'
);
assert(
  /watch-list-draft-pill/.test(adminJs),
  'admin.js must render a DRAFT pill on draft listings in the sidebar'
);

// ── Build pipeline (drafts) ────────────────────────────────────────
assert(
  /function isDraft\(watch\)/.test(generator),
  'generator must define isDraft(watch)'
);
assert(
  /noindex,nofollow,noimageindex,noarchive/.test(generator),
  'generator must emit a strong robots meta on draft pages (noindex,nofollow,noimageindex,noarchive)'
);
assert(
  /draftBannerHtml\(watch\)/.test(generator),
  'generator must inject a draft banner on draft pages'
);
assert(
  /draft\s*\?\s*''[\s\S]*productJsonLd/.test(generator),
  'generator must skip Schema.org Product JSON-LD on drafts'
);
assert(
  /watches\.filter\(\(w\)\s*=>\s*!isDraft\(w\)\)/.test(generator),
  'sitemap must exclude drafts'
);
assert(
  /WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY/.test(generator),
  'generator must read the service-role key to fetch drafts (RLS hides them from anon)'
);
assert(
  /published=eq\.false|'published',\s*'eq\.false'/.test(generator) ||
    /searchParams\.set\(\s*['"]published['"]\s*,\s*['"]eq\.false['"]\s*\)/.test(generator),
  'generator must request only drafts (published=eq.false) when fetching from Supabase'
);

console.log('Watch publish-state contract valid: schema + RLS, admin sees drafts via RPC, build pipeline marks drafts noindex + banner, sitemap published-only.');
