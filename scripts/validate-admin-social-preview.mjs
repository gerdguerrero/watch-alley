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
    console.error(`Admin social preview validation failed: ${message}`);
    process.exit(1);
  }
}

function requireInOrder(source, markers, label) {
  let cursor = -1;
  for (const marker of markers) {
    const next = source.indexOf(marker, cursor + 1);
    assert(next > cursor, `${label}: expected marker after previous marker: ${marker}`);
    cursor = next;
  }
}

const formStart = adminHtml.indexOf('id="watch-form"');
const formEnd = adminHtml.indexOf('</form>', formStart);
assert(formStart !== -1 && formEnd !== -1, 'watch form must exist');
const watchFormMarkup = adminHtml.slice(formStart, formEnd);

requireInOrder(watchFormMarkup, [
  'id="social-preview-panel"',
  'id="social-generate-preview-btn"',
  'Generate social previews',
  'id="social-primary-image-preview"',
  'id="social-facebook-caption"',
  'id="social-copy-facebook-btn"',
  'id="social-instagram-caption"',
  'id="social-copy-instagram-btn"',
  'id="social-preview-status"'
], 'social preview panel markup');

const panelStart = watchFormMarkup.indexOf('id="social-preview-panel"');
const panelEnd = watchFormMarkup.indexOf('id="social-preview-status"', panelStart);
assert(panelStart !== -1 && panelEnd !== -1, 'social preview panel must be scoped inside the watch form');
const panelMarkup = watchFormMarkup.slice(panelStart, panelEnd);

assert(/<textarea[^>]+id="social-facebook-caption"[^>]*>/.test(panelMarkup), 'Facebook caption must be an editable textarea');
assert(/<textarea[^>]+id="social-instagram-caption"[^>]*>/.test(panelMarkup), 'Instagram caption must be an editable textarea');
assert(!/<textarea[^>]+id="social-(facebook|instagram)-caption"[^>]*\b(readonly|disabled)\b/i.test(panelMarkup), 'social caption textareas must remain editable before posting');
assert(/type="button"[^>]+id="social-generate-preview-btn"/.test(panelMarkup), 'Generate social previews button must not submit the listing form');
assert(/type="button"[^>]+id="social-copy-facebook-btn"/.test(panelMarkup), 'Facebook copy button must not submit the listing form');
assert(/type="button"[^>]+id="social-copy-instagram-btn"/.test(panelMarkup), 'Instagram copy button must not submit the listing form');

for (const forbidden of [
  /facebook\/instagram password/i,
  /\baccess[-\s]?token\b/i,
  /\bapi secret\b/i,
  /\bgraph api\b/i,
]) {
  assert(!forbidden.test(panelMarkup), `owner-facing social preview panel must not expose credential/API jargon matching ${forbidden}`);
}

assert(/function\s+buildSocialPreviewDraft\s*\(/.test(adminJs), 'admin JS must build social preview drafts from listing fields');
assert(/function\s+buildPublicWatchUrl\s*\(/.test(adminJs), 'admin JS must build public watch URLs for captions');
assert(/function\s+renderSocialPreviewFromForm\s*\(/.test(adminJs), 'admin JS must render social previews from the current form');
assert(/function\s+copySocialCaption\s*\(/.test(adminJs), 'admin JS must support copying generated captions');
assert(/socialGeneratePreviewBtn\.addEventListener\(\s*['"]click['"]/s.test(adminJs), 'Generate social previews button must be wired to a click handler');
assert(/socialFacebookCaption\.value\s*=\s*captions\.facebook/.test(adminJs), 'Facebook caption must be written through textarea.value');
assert(/socialInstagramCaption\.value\s*=\s*captions\.instagram/.test(adminJs), 'Instagram caption must be written through textarea.value');
assert(/The Watch Alley/.test(adminJs), 'generated captions must use the full The Watch Alley brand');
assert(/#TheWatchAlley/.test(adminJs), 'Instagram caption must include The Watch Alley hashtag baseline');
assert(/navigator\.clipboard\.writeText/.test(adminJs), 'copy flow should use navigator.clipboard when available');
assert(/document\.execCommand\(\s*['"]copy['"]\s*\)/.test(adminJs), 'copy flow must include a textarea fallback for browsers without clipboard API');
assert(/function\s+loadIntoForm\s*\([\s\S]*?renderSocialPreviewFromForm/m.test(adminJs), 'switching to a watch must refresh the social preview from the loaded form values');
assert(/function\s+hideForm\s*\([\s\S]*?clearSocialPreview/m.test(adminJs), 'hiding the form must clear stale social captions so they cannot leak into the next listing');
assert(!/graph\.facebook\.com|instagram_content_publish|META_APP_SECRET|PAGE_ACCESS_TOKEN/i.test(adminJs), 'browser admin JS must not call Meta APIs directly or contain Meta secrets/tokens');

assert(/\.admin-social-panel\s*\{/.test(adminCss), 'social preview panel needs dedicated admin CSS');
assert(/\.social-preview-grid\s*\{[^}]*display\s*:\s*grid/s.test(adminCss), 'social preview cards must use a responsive grid');

console.log('Admin social preview contract valid: editable Facebook/Instagram previews are owner-friendly and credential-free.');
