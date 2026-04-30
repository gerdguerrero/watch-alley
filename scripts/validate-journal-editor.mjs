// Journal editor contract validator (Bet 3 Wave 1).
//
// Pins the journal CMS so future edits don't accidentally:
//   • drop the RLS posture (drafts must stay private)
//   • drop the admin RPCs that gate writes on is_admin()
//   • disconnect the build pipeline (postbuild must run journal generator
//     before the watch generator so the sitemap manifest exists)
//   • drop the markdown renderer's escape-safe behavior
//   • leak service-role secrets into admin.js
//   • lose the admin Journal tab markup or its activateTab wiring

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const migrationPath = path.join(projectRoot, 'docs', 'migrations', '0013-watch-alley-journal.sql');
const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');
const adminCss = readFileSync(path.join(projectRoot, 'styles', 'admin.css'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const generator = readFileSync(path.join(projectRoot, 'scripts', 'generate-journal-pages.mjs'), 'utf8');
const journalHtml = readFileSync(path.join(projectRoot, 'journal.html'), 'utf8');
const journalPostHtml = readFileSync(path.join(projectRoot, 'journal-post.html'), 'utf8');

function fail(message) {
  console.error(`Journal editor contract validation failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }

// ── Migration ───────────────────────────────────────────────────────
assert(existsSync(migrationPath), 'docs/migrations/0013-watch-alley-journal.sql must exist');
const migration = readFileSync(migrationPath, 'utf8');
assert(
  /create table if not exists watch_alley\.journal_posts/i.test(migration),
  'migration 0013 must create watch_alley.journal_posts'
);
assert(
  /alter table watch_alley\.journal_posts enable row level security/i.test(migration),
  'journal_posts must enable RLS'
);
assert(
  /create policy "Public read published"\s+on watch_alley\.journal_posts[\s\S]*?using\s*\(\s*status\s*=\s*'published'\s*\)/i.test(migration),
  'public RLS policy must restrict reads to status=published'
);
assert(
  /Deny direct writes[\s\S]*?with check \(false\)/i.test(migration),
  'direct INSERT must be denied for anon + authenticated'
);
assert(
  /create or replace function public\.admin_upsert_journal_post/i.test(migration),
  'admin_upsert_journal_post RPC must exist'
);
assert(
  /create or replace function public\.admin_delete_journal_post/i.test(migration),
  'admin_delete_journal_post RPC must exist'
);
assert(
  /create or replace function public\.admin_list_journal_posts/i.test(migration),
  'admin_list_journal_posts RPC must exist'
);
assert(
  /watch_alley\.is_admin\(\)/.test(migration),
  'journal RPCs must gate on watch_alley.is_admin()'
);
assert(
  /insert into storage\.buckets[\s\S]*?'journal-images'/i.test(migration),
  'migration must register the journal-images storage bucket'
);
assert(
  /create policy "Journal: admin insert"[\s\S]*?bucket_id = 'journal-images'/i.test(migration),
  'storage policy must restrict journal-images writes to admins'
);

// ── Markdown renderer (escape-safe smoke test) ──────────────────────
const sample = renderMarkdown('## Heading\n\nPlain *italic* and **bold** with [a link](https://example.com) and <script>alert(1)</script>.');
assert(/<h2>Heading<\/h2>/.test(sample), 'renderMarkdown must produce <h2> for ## headings');
assert(/<em>italic<\/em>/.test(sample), 'renderMarkdown must produce <em> for *…*');
assert(/<strong>bold<\/strong>/.test(sample), 'renderMarkdown must produce <strong> for **…**');
assert(/<a href="https:\/\/example\.com"[^>]*>a link<\/a>/.test(sample), 'renderMarkdown must produce <a> for valid links');
assert(!/\<script\>/i.test(sample), 'renderMarkdown must escape raw HTML (no <script> survives)');
const xss = renderMarkdown('[click](javascript:alert(1))');
assert(!/href="javascript:/i.test(xss), 'renderMarkdown must reject javascript: URLs');

// ── Admin tab markup ────────────────────────────────────────────────
assert(/id="admin-tab-journal"[^>]+aria-controls="tabpanel-journal"/.test(adminHtml), 'admin must declare a Journal tab button');
assert(/id="tabpanel-journal"[^>]+hidden/.test(adminHtml), 'Journal tabpanel must be hidden by default');
assert(/id="journal-list"/.test(adminHtml), 'Journal post list must exist');
assert(/id="journal-new-btn"/.test(adminHtml), '+ New post button must exist');
assert(/id="journal-form"[^>]+hidden/.test(adminHtml), 'Journal form must be hidden until a post is selected');
for (const id of [
  'journal-field-id', 'journal-field-status', 'journal-field-title',
  'journal-field-slug', 'journal-field-summary', 'journal-field-body',
  'journal-field-tags', 'journal-field-hero-image', 'journal-preview',
  'journal-save-btn', 'journal-publish-btn', 'journal-delete-btn',
]) {
  assert(adminHtml.includes(`id="${id}"`), `admin form must include #${id}`);
}
// Toolbar: every action must be present.
for (const action of ['bold', 'italic', 'h2', 'h3', 'ul', 'ol', 'quote', 'link', 'image', 'hr']) {
  assert(
    new RegExp(`data-md-action="${action}"`).test(adminHtml),
    `toolbar must include data-md-action="${action}"`
  );
}

// ── Admin CSS ───────────────────────────────────────────────────────
assert(/#tabpanel-journal\s*\{[\s\S]*?display\s*:\s*grid/.test(adminCss), '#tabpanel-journal must use a master-detail grid');
assert(/\.journal-toolbar\s*\{/.test(adminCss), '.journal-toolbar styling must exist');
assert(/\.journal-editor-grid\s*\{[\s\S]*?grid-template-columns\s*:\s*1fr\s+1fr/.test(adminCss), 'editor must split textarea + preview as two columns');
assert(/\.journal-preview\s*\{/.test(adminCss), '.journal-preview styling must exist');

// ── Admin JS wiring ─────────────────────────────────────────────────
assert(/import\s+\{\s*renderMarkdown\s*\}\s+from\s+['"]\.\/lib\/markdown\.mjs['"]/.test(adminJs), 'admin.js must import renderMarkdown from scripts/lib/markdown.mjs');
assert(/tabpanelJournal\.hidden\s*=\s*name\s*!==\s*['"]journal['"]/.test(adminJs), 'activateTab must hide the Journal tabpanel when inactive');
assert(/name === ['"]journal['"]\)\s*loadJournalPosts\(\)/.test(adminJs), 'activateTab must call loadJournalPosts() when the Journal tab activates');
assert(/supabase\.rpc\(\s*['"]admin_list_journal_posts['"]/.test(adminJs), 'admin.js must call admin_list_journal_posts');
assert(/supabase\.rpc\(\s*['"]admin_upsert_journal_post['"]/.test(adminJs), 'admin.js must call admin_upsert_journal_post');
assert(/supabase\.rpc\(\s*['"]admin_delete_journal_post['"]/.test(adminJs), 'admin.js must call admin_delete_journal_post');
assert(/supabase\.storage\.from\(\s*['"]journal-images['"]\s*\)\.upload\(/.test(adminJs), 'admin.js must upload hero images to the journal-images bucket');
assert(/data-md-action/.test(adminJs), 'admin.js must wire the toolbar buttons');
assert(/applyMarkdownAction/.test(adminJs), 'admin.js must define applyMarkdownAction');
assert(/Saved\. The website updates automatically\./.test(adminJs), 'save success copy must mention automatic website updates');
assert(/Published\. The website updates automatically\./.test(adminJs), 'publish success copy must mention automatic website updates');
assert(/Deleted\. The website updates automatically\./.test(adminJs), 'delete success copy must mention automatic website updates');
assert(!/Accept-Profile['"]?\s*:\s*['"]watch_alley['"]/.test(journalHtml), 'public journal list must query the exposed public view, not the private watch_alley schema');
assert(!/Accept-Profile['"]?\s*:\s*['"]watch_alley['"]/.test(journalPostHtml), 'public journal article must query the exposed public view, not the private watch_alley schema');
assert(/from\s+['"]\/scripts\/lib\/markdown\.mjs['"]/.test(journalPostHtml), 'journal-post must import markdown from an absolute path under /journal/<slug>');
assert(/href="\/styles\/trust-page\.css"/.test(journalPostHtml), 'journal-post must load CSS from an absolute path under /journal/<slug>');
assert(/href="\/privacy"/.test(journalPostHtml) && /href="\/terms"/.test(journalPostHtml), 'journal-post footer links must stay root-relative under /journal/<slug>');
assert(/\/journal\/\$\{encodeURIComponent\(r\.slug\)\}/.test(adminJs), 'admin activity links must use canonical /journal/<slug> URLs');
assert(/dataset\.url\s*=\s*`\/journal\/\$\{post\.slug\}`/.test(adminJs), 'admin preview button must use canonical /journal/<slug> URLs');
assert(/href="\/journal\/\$\{escapeHtml\(post\.slug\)\}"/.test(generator), 'journal generator must emit canonical /journal/<slug> links');
assert(/<section class="journal-list" id="journal-list"/.test(generator), 'journal generator must preserve #journal-list so live hydration can replace the build snapshot');
assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(adminJs), 'admin.js must never reference SUPABASE_SERVICE_ROLE_KEY');

// ── Build pipeline order ───────────────────────────────────────────
assert(
  /generate-journal-pages\.mjs\s*&&\s*node\s+scripts\/generate-watch-pages\.mjs/.test(pkg.scripts.postbuild || ''),
  'postbuild must run generate-journal-pages.mjs BEFORE generate-watch-pages.mjs (so the sitemap manifest exists when watches build)'
);
assert(/_manifest\.json/.test(generator), 'journal generator must write a _manifest.json so generate-watch-pages.mjs can include slugs in the sitemap');

console.log('Journal editor contract valid: schema + RLS + RPCs + bucket, escape-safe markdown renderer, admin tab + toolbar + live preview wired, build pipeline ordered correctly.');
