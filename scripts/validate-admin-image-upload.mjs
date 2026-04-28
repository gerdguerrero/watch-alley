import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');
const adminCss = readFileSync(path.join(projectRoot, 'styles', 'admin.css'), 'utf8');

function fail(message) {
  console.error(`Admin image upload validation failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }

// ── Markup ────────────────────────────────────────────────────────
assert(adminHtml.includes('id="image-uploader"'), 'admin must include the #image-uploader region');
{
  const fileInputMatch = adminHtml.match(/<input[^>]+id="image-upload-input"[^>]*>/);
  assert(fileInputMatch, 'admin must include an <input id="image-upload-input">');
  const fileInputTag = fileInputMatch[0];
  assert(/type="file"/.test(fileInputTag), 'image upload input must be type="file"');
  assert(/accept="image\/jpeg,image\/png,image\/webp,image\/avif"/.test(fileInputTag),
    'image upload input must accept the bucket-allowed mime types: image/jpeg,image/png,image/webp,image/avif');
  assert(/\bmultiple\b/.test(fileInputTag), 'image upload input must allow multiple file selection');
}
assert(adminHtml.includes('id="image-dropzone"'), 'admin must include the drag-and-drop dropzone');
assert(adminHtml.includes('id="image-thumbs"'), 'admin must include the thumbnail grid container');
assert(adminHtml.includes('id="field-primaryImage"'), 'legacy primaryImage field must remain available behind the advanced disclosure');
assert(adminHtml.includes('id="field-images"'), 'legacy images textarea must remain available behind the advanced disclosure');
assert(/<details[^>]*class="admin-image-paths-details"/.test(adminHtml),
  'raw image paths must live inside an <details class="admin-image-paths-details"> disclosure');

// ── Upload wiring ────────────────────────────────────────────────
assert(/const STORAGE_BUCKET\s*=\s*['"]watches['"]/.test(adminJs),
  'admin.js must declare STORAGE_BUCKET = "watches" matching the migration');
assert(/supabase\.storage\.from\(STORAGE_BUCKET\)\.upload\(/.test(adminJs),
  'admin.js must call supabase.storage.from(STORAGE_BUCKET).upload(...)');
assert(/supabase\.storage\.from\(STORAGE_BUCKET\)\.getPublicUrl\(/.test(adminJs),
  'admin.js must call getPublicUrl(...) on the bucket to surface CDN URLs');
assert(/function buildStoragePath\s*\(/.test(adminJs),
  'admin.js must define buildStoragePath() to namespace uploads under a slug folder');
assert(/function sanitizeFilename\s*\(/.test(adminJs),
  'admin.js must define sanitizeFilename() to keep storage keys URL-safe');
assert(/function uploadFiles\s*\(/.test(adminJs),
  'admin.js must define uploadFiles() to handle one or many file uploads');

// ── Drag-and-drop and click-to-pick ──────────────────────────────
for (const evt of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  assert(adminJs.includes(`'${evt}'`), `dropzone must wire the ${evt} event`);
}
assert(/imageDropzone\.addEventListener\(\s*['"]click['"]/.test(adminJs),
  'dropzone must open the file picker on click');

// ── Thumb controls: reorder + remove ─────────────────────────────
assert(/data-image-action="left"/.test(adminJs), 'thumbs must expose a "left" reorder control');
assert(/data-image-action="right"/.test(adminJs), 'thumbs must expose a "right" reorder control');
assert(/data-image-action="remove"/.test(adminJs), 'thumbs must expose a "remove" control');
assert(/imageList\.splice\(index, 1\)/.test(adminJs), 'remove action must drop the entry from imageList');

// ── Sync back to legacy form fields so save payload still works ──
assert(/function syncImageFields\s*\(/.test(adminJs),
  'admin.js must define syncImageFields() to mirror imageList back into the form fields');
assert(/setField\(\s*['"]images['"]\s*,\s*imageList\.join\(['"]\\n['"]\)\s*\)/.test(adminJs),
  'syncImageFields must keep the images textarea in sync with imageList');
assert(/setField\(\s*['"]primaryImage['"]\s*,\s*imageList\[0\]\s*\|\|\s*['"]['"]\s*\)/.test(adminJs),
  'syncImageFields must set primaryImage to the first image in imageList');

// ── Lifecycle: image list clears on hideForm and loads on selection ──
assert(/setImageList\(\[\]\)/.test(adminJs), 'hideForm must reset the image list to an empty array');
assert(/setImageList\(Array\.isArray\(watch\?\.images\)\s*\?\s*watch\.images\.slice\(\)\s*:\s*\[\]\)/.test(adminJs),
  'loadIntoForm must hydrate setImageList() from the watch.images array');

// ── CSS hooks (so the upload region actually renders) ────────────
assert(/\.admin-image-uploader\s*\{/.test(adminCss), 'admin.css must define .admin-image-uploader');
assert(/\.admin-image-dropzone\s*\{/.test(adminCss), 'admin.css must define .admin-image-dropzone');
assert(/\.admin-image-thumbs\s*\{/.test(adminCss), 'admin.css must define .admin-image-thumbs');
assert(/\.admin-image-thumb\.is-primary\s*\{/.test(adminCss),
  'admin.css must visually mark the primary thumb (.admin-image-thumb.is-primary)');

console.log('Admin image upload contract valid: dropzone, file picker, reorder, remove, and form-field sync are wired to the watches storage bucket.');
