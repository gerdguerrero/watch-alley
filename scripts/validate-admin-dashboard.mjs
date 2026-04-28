// Admin dashboard contract validator (Bet 3 Wave 3).
//
// Pins the operator's landing surface so future edits don't accidentally:
//   • drop the SECURITY DEFINER guard on admin_dashboard_metrics
//   • change the JSON shape that the admin client iterates
//   • break the default-tab promotion (Dashboard, not Inbox)
//   • lose the KPI tiles, top-watches list, lost-reasons breakdown, or
//     recent-activity feed

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const migrationPath = path.join(projectRoot, 'docs', 'migrations', '0015-watch-alley-admin-dashboard.sql');
const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');
const adminCss = readFileSync(path.join(projectRoot, 'styles', 'admin.css'), 'utf8');

function fail(msg) {
  console.error(`Admin dashboard contract validation failed: ${msg}`);
  process.exit(1);
}
function assert(cond, msg) { if (!cond) fail(msg); }

// ── Migration ───────────────────────────────────────────────────────
assert(existsSync(migrationPath), 'docs/migrations/0015-watch-alley-admin-dashboard.sql must exist');
const migration = readFileSync(migrationPath, 'utf8');
assert(
  /create or replace function public\.admin_dashboard_metrics\(\)/i.test(migration),
  'migration 0015 must create admin_dashboard_metrics() RPC'
);
assert(
  /security definer/i.test(migration) && /watch_alley\.is_admin\(\)/.test(migration),
  'admin_dashboard_metrics must be SECURITY DEFINER and gated on is_admin()'
);
assert(
  /set search_path = ''/i.test(migration),
  'admin_dashboard_metrics must pin an empty search_path'
);
assert(
  /grant execute on function public\.admin_dashboard_metrics\(\) to authenticated/i.test(migration),
  'authenticated must be able to execute admin_dashboard_metrics'
);
assert(
  /revoke all on function public\.admin_dashboard_metrics\(\) from public,\s*anon/i.test(migration),
  'admin_dashboard_metrics must revoke from public + anon'
);
// JSON shape must include the keys the client iterates.
for (const key of [
  "'inquiries'", "'replySla'", "'conversion'",
  "'topWatches'", "'lostReasons'", "'inventory'", "'journal'", "'activity'",
  "'generatedAt'",
]) {
  assert(
    migration.includes(key),
    `admin_dashboard_metrics jsonb_build_object must include key ${key}`
  );
}
// Reply-SLA uses percentile_cont for the median.
assert(
  /percentile_cont\(0\.5\)\s+within\s+group/i.test(migration),
  'replySla must compute median via percentile_cont(0.5) within group'
);

// ── Admin tab markup ────────────────────────────────────────────────
assert(/id="admin-tab-dashboard"[^>]+aria-controls="tabpanel-dashboard"/.test(adminHtml), 'admin must declare a Dashboard tab button');
assert(/id="admin-tab-dashboard"[^>]+aria-selected="true"/.test(adminHtml), 'Dashboard must be the default-selected entry tab');
assert(/id="tabpanel-dashboard"/.test(adminHtml), 'admin must declare the Dashboard tabpanel');

for (const id of [
  'admin-dashboard-grid',
  'admin-dashboard-top-watches',
  'admin-dashboard-lost-reasons',
  'admin-dashboard-activity',
  'admin-dashboard-journal',
  'admin-dashboard-refresh',
]) {
  assert(adminHtml.includes(`id="${id}"`), `admin must include #${id}`);
}

// KPI value placeholders.
for (const key of [
  'inquiries.last7', 'inquiries.open', 'conversion.rate',
  'replySla.median', 'inventory.soldThisMonth', 'inventory.published',
  'journal.published', 'journal.drafts', 'journal.scheduled',
]) {
  assert(
    adminHtml.includes(`data-kpi="${key}"`),
    `admin must include a data-kpi="${key}" placeholder`
  );
}

// ── Admin CSS ───────────────────────────────────────────────────────
assert(/\.admin-dashboard\s*\{/.test(adminCss), '.admin-dashboard styling must exist');
assert(/\.admin-dashboard-grid\s*\{[\s\S]*?display\s*:\s*grid/.test(adminCss), '.admin-dashboard-grid must lay out KPI tiles in a grid');
assert(/\.kpi-tile\s*\{/.test(adminCss), '.kpi-tile styling must exist');
assert(/\.kpi-value\s*\{[\s\S]*?Petrona/.test(adminCss), 'KPI values must render in Petrona display');
assert(/\.dashboard-list-bar\s*\{/.test(adminCss), 'horizontal bar styling must exist for top-watches and lost-reasons');

// ── Admin JS wiring ─────────────────────────────────────────────────
assert(/async function loadDashboard\(/.test(adminJs), 'admin.js must define loadDashboard()');
assert(/supabase\.rpc\(\s*['"]admin_dashboard_metrics['"]\s*\)/.test(adminJs), 'admin.js must call admin_dashboard_metrics RPC');
assert(/tabpanelDashboard\.hidden\s*=\s*name\s*!==\s*['"]dashboard['"]/.test(adminJs), 'activateTab must hide the Dashboard tabpanel when inactive');
assert(/name === ['"]dashboard['"]\)\s*loadDashboard\(\)/.test(adminJs), 'activateTab must call loadDashboard() when the Dashboard tab activates');
assert(/await loadWatches\(\);[\s\S]{0,200}loadDashboard\(\)/.test(adminJs), 'post-login bootstrap must call loadDashboard() (Dashboard is the default landing tab)');
assert(/data-kpi="inquiries\.last7"|setDashboardKpi\('inquiries\.last7'/.test(adminJs), 'admin.js must populate the inquiries.last7 KPI');
assert(/renderTopWatches/.test(adminJs), 'admin.js must define renderTopWatches');
assert(/renderLostReasons/.test(adminJs), 'admin.js must define renderLostReasons');
assert(/renderActivity/.test(adminJs), 'admin.js must define renderActivity');
assert(/percentile|formatDuration|medianSeconds/.test(adminJs), 'admin.js must render the reply-SLA median (formatDuration/medianSeconds)');

console.log('Admin dashboard contract valid: RPC + JSON shape, Dashboard is the default tab, KPI tiles + top watches + lost reasons + activity feed wired.');
