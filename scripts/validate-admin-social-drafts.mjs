import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function requireInOrder(haystack, needles, label) {
  let cursor = 0;
  for (const needle of needles) {
    const idx = haystack.indexOf(needle, cursor);
    assert(idx !== -1, `${label}: missing or out-of-order marker ${JSON.stringify(needle)}`);
    cursor = idx + needle.length;
  }
}

const adminHtml = read('admin/index.html');
const adminJs = read('scripts/admin.js');
const adminCss = read('styles/admin.css');
const migrationPath = 'docs/migrations/0009-watch-alley-social-publishing-drafts.sql';
const migration = read(migrationPath);
const planMd = read('docs/plans/2026-04-28-controlled-meta-social-publishing.md');
const inventorySchema = read('docs/inventory-schema.md');

// --- Migration contract ----------------------------------------------------
// The migration must:
// (a) create the social_posts table in watch_alley with the expected columns
// (b) enable RLS and deny direct anon/authenticated access
// (c) define exactly the three Phase A admin RPCs, all SECURITY DEFINER with
//     search_path pinned and gated by watch_alley.is_admin()
// (d) never reference Meta tokens, app secrets, or page access tokens

requireInOrder(migration, [
  'create table if not exists watch_alley.social_posts',
  'platform text not null check (platform in (\'facebook\',\'instagram\'))',
  'status text not null default \'draft\' check (status in (\'draft\',\'queued\',\'publishing\',\'published\',\'failed\',\'skipped\'))',
  'caption text not null',
  'media_urls text[] not null default',
  'unique (watch_id, platform)',
  'alter table watch_alley.social_posts enable row level security',
  '"Deny all direct access"',
  'using (false)',
  'with check (false)',
], 'social_posts schema + RLS');

// Drafts must vanish with the parent watch — FK cascade is a contract.
assert(
  /references\s+watch_alley\.watches\s*\(\s*id\s*\)\s*on\s+delete\s+cascade/i.test(migration),
  'social_posts.watch_id must reference watch_alley.watches(id) ON DELETE CASCADE'
);

// Re-saving must upsert (not double-insert) for the same (watch_id, platform).
assert(
  /on\s+conflict\s*\(\s*watch_id\s*,\s*platform\s*\)\s*do\s+update/i.test(migration),
  'admin_save_social_draft must upsert via ON CONFLICT (watch_id, platform) DO UPDATE'
);

// updated_at must come from the shared trigger so the "last updated" meta
// line in the admin UI stays truthful.
assert(
  /create trigger\s+social_posts_set_updated_at[\s\S]*?for each row\s+execute\s+function\s+watch_alley\.set_updated_at/i.test(migration),
  'social_posts must wire the watch_alley.set_updated_at() trigger so updated_at stays correct'
);

for (const fn of [
  'admin_save_social_draft',
  'admin_list_social_drafts_for_watch',
  'admin_delete_social_draft',
]) {
  const fnRegex = new RegExp(
    `create or replace function public\\.${fn}\\([\\s\\S]*?language plpgsql[\\s\\S]*?security definer[\\s\\S]*?set search_path\\s*=\\s*''[\\s\\S]*?if not watch_alley\\.is_admin\\(\\) then[\\s\\S]*?\\$\\$;`,
    'm'
  );
  assert(fnRegex.test(migration), `${fn} must be SECURITY DEFINER with pinned search_path and is_admin() gate`);
  assert(
    new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon`).test(migration),
    `${fn} EXECUTE must be revoked from anon`
  );
  assert(
    new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated`).test(migration),
    `${fn} EXECUTE must be granted to authenticated only`
  );
}

assert(
  !/access[_-]?token|app[_-]?secret|page[_-]?access[_-]?token|graph\.facebook\.com|instagram_content_publish|META_APP_SECRET/i.test(migration),
  'social drafts migration must not reference Meta tokens, app secrets, or Graph API'
);

// --- Admin UI contract -----------------------------------------------------

assert(/id="social-save-draft-btn"/.test(adminHtml), 'admin form must expose a Save drafts button (id=social-save-draft-btn)');
assert(/id="social-saved-drafts-meta"/.test(adminHtml), 'admin form must expose a saved-draft timestamp/meta line (id=social-saved-drafts-meta)');
assert(
  /(name="social-save-draft-btn"|<button[^>]*type="button"[^>]*id="social-save-draft-btn")/.test(adminHtml),
  'Save drafts button must be type="button" so it does not submit the listing form'
);

// --- Admin JS contract -----------------------------------------------------

assert(/supabase\.rpc\(\s*['"]admin_save_social_draft['"]/s.test(adminJs), 'admin.js must call supabase.rpc("admin_save_social_draft")');
assert(/supabase\.rpc\(\s*['"]admin_list_social_drafts_for_watch['"]/s.test(adminJs), 'admin.js must call supabase.rpc("admin_list_social_drafts_for_watch")');
assert(/function\s+saveSocialDrafts\s*\(/.test(adminJs), 'admin.js must expose saveSocialDrafts() helper');
assert(/function\s+loadSocialDraftsForActiveWatch\s*\(/.test(adminJs), 'admin.js must expose loadSocialDraftsForActiveWatch() helper');

// Unsaved-listing guard — the Save drafts button must require a saved listing
// (we save by watchId; without a saved row there is no FK target).
assert(/saveSocialDrafts[\s\S]{0,800}activeId/.test(adminJs), 'saveSocialDrafts must check that a watch row exists before saving');

// Stale-RPC race guard — both helpers must capture activeId at call time
// and bail when the user has switched listings while the RPC was in flight.
// Without this guard, a slow response from watch A can overwrite watch B's
// captions and the next Save click silently persists A's drafts onto B.
assert(
  /async\s+function\s+loadSocialDraftsForActiveWatch\s*\([\s\S]*?const\s+requestedWatchId\s*=\s*activeId[\s\S]*?requestedWatchId\s*!==\s*activeId/m.test(adminJs),
  'loadSocialDraftsForActiveWatch must capture activeId and bail if the user switched listings mid-flight'
);
assert(
  /async\s+function\s+saveSocialDrafts\s*\([\s\S]*?const\s+requestedWatchId\s*=\s*activeId[\s\S]*?watchId:\s*requestedWatchId/m.test(adminJs),
  'saveSocialDrafts must capture activeId and bind the rpc payload to the captured id'
);

// Lifecycle integration: switching watches loads existing drafts; hiding the
// form clears the saved-draft meta line so it cannot leak across listings.
assert(/function\s+loadIntoForm\s*\([\s\S]*?loadSocialDraftsForActiveWatch/m.test(adminJs), 'switching to a watch must load any saved drafts');
assert(/function\s+hideForm\s*\([\s\S]*?savedDraftsMeta/m.test(adminJs), 'hiding the form must clear the saved-drafts meta line');

// Save button is wired and Phase A still has no Meta API calls in the browser.
assert(/socialSaveDraftBtn\.addEventListener\(\s*['"]click['"]/s.test(adminJs), 'Save drafts button must be wired to a click handler');
assert(
  !/graph\.facebook\.com|instagram_content_publish|META_APP_SECRET|PAGE_ACCESS_TOKEN/i.test(adminJs),
  'browser admin JS must not call Meta APIs directly or contain Meta secrets/tokens'
);

// --- Owner-facing copy must remain credential-free ------------------------
const panelStart = adminHtml.indexOf('id="social-preview-panel"');
const panelEnd = adminHtml.indexOf('</section>', panelStart);
assert(panelStart !== -1 && panelEnd !== -1, 'social preview panel must be present in the watch form');
const panelMarkup = adminHtml.slice(panelStart, panelEnd);
for (const forbidden of [
  /facebook\/instagram password/i,
  /\baccess[-\s]?token\b/i,
  /\bapi secret\b/i,
  /\bgraph api\b/i,
  /\bservice[-\s]?role\b/i,
]) {
  assert(!forbidden.test(panelMarkup), `owner-facing social panel must not expose credential/API jargon matching ${forbidden}`);
}

// Encourage owner-friendly copy on the save flow — at least one of the
// expected confirmation strings must exist in the JS so the validator
// catches a regression that silently drops user feedback.
assert(/Drafts? saved/i.test(adminJs), 'admin.js must produce a "Drafts saved" confirmation when persisting drafts');

// --- Plan and schema docs must mention the new tables/RPCs ----------------

assert(/social_posts/.test(planMd), 'plan must reference the social_posts table');
assert(/admin_save_social_draft/.test(inventorySchema) || /social_posts/.test(inventorySchema), 'inventory-schema.md must document the new social drafts surface');

// --- CSS — the save-button row gets its own admin-friendly affordance -----
assert(/\.social-preview-actions[\s\S]*display\s*:\s*flex/.test(adminCss) || /\.social-preview-field-actions[\s\S]*display\s*:\s*flex/.test(adminCss),
  'social preview panel must lay out its action buttons in a flex row');

console.log('Admin social drafts contract valid: persistent Supabase drafts wired with admin-only RPCs, lifecycle integration, and owner-friendly copy.');
