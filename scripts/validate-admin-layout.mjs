import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const adminHtml = fs.readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminCss = fs.readFileSync(path.join(projectRoot, 'styles', 'admin.css'), 'utf8');
const adminJs = fs.readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`Admin layout validation failed: ${message}`);
    process.exit(1);
  }
}

function includesInOrder(source, markers, label) {
  let cursor = -1;
  for (const marker of markers) {
    const next = source.indexOf(marker, cursor + 1);
    assert(next > cursor, `${label}: expected marker after previous marker: ${marker}`);
    cursor = next;
  }
}

// The admin workspace must be one shell containing a tab row plus isolated tabpanels.
includesInOrder(adminHtml, [
  'id="workspace-panel"',
  'role="tablist"',
  'id="admin-tab-inventory"',
  'aria-controls="tabpanel-inventory"',
  'id="admin-tab-admins"',
  'aria-controls="tabpanel-admins"',
  'id="admin-tab-account"',
  'aria-controls="tabpanel-account"',
  'id="tabpanel-inventory"',
  'id="tabpanel-admins"',
  'id="tabpanel-account"'
], 'workspace/tab markup order');

assert(/<section[^>]+id="workspace-panel"[^>]+hidden/.test(adminHtml), 'workspace panel must be hidden until auth/allowlist gate passes');
assert(/id="tabpanel-admins"[^>]+hidden/.test(adminHtml), 'Admins tabpanel must be hidden by default');
assert(/id="tabpanel-account"[^>]+hidden/.test(adminHtml), 'Account tabpanel must be hidden by default');

const inventoryStart = adminHtml.indexOf('id="tabpanel-inventory"');
const adminsStart = adminHtml.indexOf('id="tabpanel-admins"');
assert(inventoryStart !== -1 && adminsStart !== -1 && adminsStart > inventoryStart, 'inventory tabpanel must appear before Admins tabpanel');
const inventoryPanelMarkup = adminHtml.slice(inventoryStart, adminsStart);
assert(inventoryPanelMarkup.includes('class="admin-sidebar"'), 'inventory sidebar must live inside #tabpanel-inventory');
assert(inventoryPanelMarkup.includes('id="admin-detail"'), 'inventory detail panel must live inside #tabpanel-inventory');
assert(inventoryPanelMarkup.includes('id="watch-form"'), 'watch form must live inside #tabpanel-inventory detail panel');
assert(/id="watch-form"[^>]+hidden/.test(inventoryPanelMarkup), 'watch form must be hidden until a watch/new item is selected');

// Regression guard: component display rules must never overpower the HTML hidden attribute.
assert(/\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important\s*;?[^}]*\}/s.test(adminCss), 'global [hidden] rule must use display:none !important so hidden panels/forms cannot leak');
assert(/\.admin-workspace\s*\{[^}]*display\s*:\s*flex\s*;[^}]*flex-direction\s*:\s*column\s*;[^}]*\}/s.test(adminCss), '.admin-workspace must be a vertical shell, not the master/detail grid');
assert(/#tabpanel-inventory\s*\{[^}]*display\s*:\s*grid\s*;[^}]*grid-template-columns\s*:\s*minmax\(280px,\s*360px\)\s*1fr\s*;[^}]*\}/s.test(adminCss), '#tabpanel-inventory must own the inventory master/detail grid');
assert(/#tabpanel-inventory\[hidden\]\s*\{[^}]*display\s*:\s*none\s*;?[^}]*\}/s.test(adminCss), '#tabpanel-inventory hidden override must exist');
assert(/\.admin-tabpanel\[hidden\]\s*\{[^}]*display\s*:\s*none\s*;?[^}]*\}/s.test(adminCss), 'hidden tabpanels must be display:none');

// JS must toggle one tabpanel at a time and keep ARIA state in sync.
assert(/function\s+activateTab\s*\(\s*name\s*,\s*\{\s*focus\s*=\s*false\s*\}\s*=\s*\{\}\s*\)/.test(adminJs), 'activateTab(name, { focus }) function is required');
assert(/tabpanelInventory\.hidden\s*=\s*name\s*!==\s*['"]inventory['"]/.test(adminJs), 'activateTab must hide inventory tabpanel when inactive');
assert(/tabpanelAdmins\.hidden\s*=\s*name\s*!==\s*['"]admins['"]/.test(adminJs), 'activateTab must hide Admins tabpanel when inactive');
assert(/tabpanelAccount\.hidden\s*=\s*name\s*!==\s*['"]account['"]/.test(adminJs), 'activateTab must hide Account tabpanel when inactive');
assert(/setAttribute\(\s*['"]aria-selected['"]\s*,\s*active\s*\?\s*['"]true['"]\s*:\s*['"]false['"]\s*\)/.test(adminJs), 'activateTab must keep aria-selected in sync');
assert(/setAttribute\(\s*['"]tabindex['"]\s*,\s*active\s*\?\s*['"]0['"]\s*:\s*['"]-1['"]\s*\)/.test(adminJs), 'activateTab must keep roving tabindex in sync');
assert(/event\.key\s*===\s*['"]ArrowRight['"]/.test(adminJs) && /event\.key\s*===\s*['"]ArrowLeft['"]/.test(adminJs), 'tabs must support keyboard left/right navigation');
assert(/event\.key\s*===\s*['"]Home['"]/.test(adminJs) && /event\.key\s*===\s*['"]End['"]/.test(adminJs), 'tabs must support Home/End keyboard navigation');

assert(/els\.workspace\.hidden\s*=\s*panel\s*!==\s*['"]workspace['"]/.test(adminJs), 'showOnly must hide workspace outside authenticated workspace state');
assert(/passwordSetupPanel\)\s*els\.passwordSetupPanel\.hidden\s*=\s*panel\s*!==\s*['"]passwordSetup['"]/.test(adminJs), 'showOnly must isolate password setup panel');

console.log('Admin layout contract valid: hidden panels cannot leak; inventory grid and tab isolation are guarded.');
