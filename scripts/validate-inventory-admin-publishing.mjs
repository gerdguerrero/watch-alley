// Inventory admin publishing UX validator.
//
// Protects the owner workflow expected from a commerce CMS:
//   - Save is allowed as a draft workflow.
//   - Publish is an explicit, confirmed transition.
//   - View Listing appears after a saved listing has a public URL.
//   - Missing required fields are highlighted and focused before any RPC write.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');
const adminCss = readFileSync(path.join(projectRoot, 'styles', 'admin.css'), 'utf8');

function fail(msg) {
  console.error(`Inventory admin publishing validation failed: ${msg}`);
  process.exit(1);
}
function assert(cond, msg) { if (!cond) fail(msg); }

assert(/<form[^>]*id="watch-form"[^>]*novalidate/.test(adminHtml), 'watch form must use custom JS validation');
assert(/id="watch-form-errors"/.test(adminHtml), 'watch form must include a validation summary');
assert(/id="publish-watch-btn"/.test(adminHtml), 'watch form must expose Publish now');
assert(/id="view-listing-btn"/.test(adminHtml), 'watch form must expose View Listing');
assert(!/id="field-published" checked/.test(adminHtml), 'new listings must not be marked published by static HTML default');

assert(/publishWatchBtn:\s*document\.getElementById\('publish-watch-btn'\)/.test(adminJs), 'admin.js must cache Publish now');
assert(/viewListingBtn:\s*document\.getElementById\('view-listing-btn'\)/.test(adminJs), 'admin.js must cache View Listing');
assert(/function\s+validateWatchForm\s*\(/.test(adminJs), 'admin.js must define inventory validation');
assert(/function\s+focusInvalidWatchField\s*\(/.test(adminJs), 'admin.js must focus invalid fields');
assert(/scrollIntoView\(\{\s*behavior:\s*'smooth'/.test(adminJs), 'invalid fields must be scrolled into view');
assert(/Please fill out/.test(adminJs), 'validation copy must tell the admin what to complete');
assert(/function\s+publishCurrentListing\s*\(/.test(adminJs), 'admin.js must define explicit publish handler');
assert(/window\.confirm\([\s\S]*Publish/.test(adminJs), 'Publish now must ask for confirmation');
assert(/setCheckbox\('published',\s*true\)/.test(adminJs), 'Publish now must set published=true before saving');
assert(/saveCurrentForm\(\{\s*publishNow:\s*true,\s*skipValidation:\s*true\s*\}\)/.test(adminJs), 'Publish now must persist through the normal upsert path');
assert(/function\s+syncListingActionButtons\s*\(/.test(adminJs), 'admin.js must synchronize publish/view buttons');
assert(/listingUrlForSlug/.test(adminJs), 'View Listing must use the canonical listing URL helper');
assert(/#preview-as-buyer-btn,\s*#view-listing-btn/.test(adminJs), 'preview and view buttons must share safe open behavior');

assert(/\.admin-validation-summary/.test(adminCss), 'CSS must style the validation summary');
assert(/\.admin-field-error/.test(adminCss), 'CSS must style per-field validation messages');
assert(/\.is-invalid/.test(adminCss), 'CSS must highlight invalid fields');

console.log('Inventory admin publishing UX valid: draft save, confirmed publish, view listing, and inline validation are wired.');
