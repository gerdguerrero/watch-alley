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

const adminHtml = read('admin/index.html');
const adminJs = read('scripts/admin.js');
const adminCss = read('styles/admin.css');

// --- Mockup card structure -------------------------------------------------
// The owner-facing preview must include actual Facebook + Instagram post
// mockups (chrome, image, caption, action toolbar) so the owner can see
// roughly how their post will look before publishing — not just a raw
// editable caption.

const panelStart = adminHtml.indexOf('id="social-preview-panel"');
const panelEnd = adminHtml.indexOf('</section>', panelStart);
assert(panelStart !== -1 && panelEnd !== -1, 'social preview panel must be present');
const panelMarkup = adminHtml.slice(panelStart, panelEnd);

const requiredIds = [
  'social-fb-mockup',
  'social-fb-mockup-image',
  'social-fb-mockup-caption',
  'social-ig-mockup',
  'social-ig-mockup-image',
  'social-ig-mockup-caption',
];
for (const id of requiredIds) {
  assert(panelMarkup.includes(`id="${id}"`), `social preview panel must contain id="${id}"`);
}

// FB mockup chrome — profile name, "page-like" handle context, action bar.
assert(/data-mockup="facebook"/.test(panelMarkup), 'FB mockup must be tagged data-mockup="facebook"');
assert(/data-mockup="instagram"/.test(panelMarkup), 'IG mockup must be tagged data-mockup="instagram"');
assert(/class="social-mockup-page-name"/.test(panelMarkup), 'FB mockup must show the page name');
assert(/class="social-mockup-actions"/.test(panelMarkup), 'mockup must include an action toolbar (like/comment/share/send)');

// Engagement counts placeholders so the owner sees the social-context UI.
assert(/social-mockup-engagement/.test(panelMarkup), 'mockup must include engagement count placeholders');

// IG truncation affordance: caption preview must include a "more" toggle so
// the owner sees how their first ~125 chars will appear before truncation.
assert(/social-ig-mockup-more|class="social-mockup-more"|aria-label="See more"/.test(panelMarkup),
  'IG mockup must include a See more affordance for caption truncation');

// --- Live updates ----------------------------------------------------------

assert(/function\s+renderSocialMockups\s*\(/.test(adminJs),
  'admin.js must expose renderSocialMockups() to push captions/image into the mockup cards');

// Live updates as the owner types — input listeners on both textareas.
assert(/socialFacebookCaption[^]*addEventListener\(\s*['"]input['"]/.test(adminJs),
  'Facebook caption textarea must update the mockup live on input');
assert(/socialInstagramCaption[^]*addEventListener\(\s*['"]input['"]/.test(adminJs),
  'Instagram caption textarea must update the mockup live on input');

// XSS-safe: mockup captions are written with textContent (not innerHTML).
// FB writes the textContent of the caption element directly; IG writes the
// textContent of an inner span so the username strong/more button structure
// stays intact, but neither path uses innerHTML on user-controlled data.
assert(/socialFbMockupCaption\.textContent\s*=/.test(adminJs),
  'FB mockup caption must be written via textContent (not innerHTML)');
assert(/captionTextNode\.textContent\s*=/.test(adminJs),
  'IG mockup caption text must be written via textContent (not innerHTML)');
assert(!/social(Fb|Ig)Mockup[A-Za-z]*\.innerHTML\s*=/.test(adminJs),
  'mockup elements must not be assigned via innerHTML');

// Mockups must refresh inside renderSocialPreviewFromForm so generating a
// preview also updates the visible mockups.
assert(/renderSocialPreviewFromForm[\s\S]*?renderSocialMockups\s*\(/m.test(adminJs),
  'renderSocialPreviewFromForm must call renderSocialMockups so preview generation updates the mockups');

// Defense-in-depth: image src goes through a scheme allowlist (rejects
// javascript:, data:text/html, etc.) and falls back to the placeholder
// when the image fails to load (404, typo'd path).
assert(/SAFE_MOCKUP_IMAGE_SCHEME\s*=\s*\/\^\(https/.test(adminJs),
  'mockup image src must go through a scheme allowlist regex');
assert(/imgEl\.onerror\s*=/.test(adminJs),
  'mockup images must wire an onerror handler that falls back to the placeholder');

// --- CSS hooks for the new structure ---------------------------------------

assert(/\.social-mockup\s*\{/.test(adminCss),
  '.social-mockup base style must exist');
assert(/\.social-mockup-actions\s*\{/.test(adminCss),
  '.social-mockup-actions toolbar style must exist');
assert(/\[data-mockup="facebook"\]/.test(adminCss) || /\.social-mockup--facebook/.test(adminCss),
  'FB mockup must have its own scoped styling');
assert(/\[data-mockup="instagram"\]/.test(adminCss) || /\.social-mockup--instagram/.test(adminCss),
  'IG mockup must have its own scoped styling');

// --- Owner-facing copy must remain credential-free -------------------------
for (const forbidden of [
  /facebook\/instagram password/i,
  /\baccess[-\s]?token\b/i,
  /\bapi secret\b/i,
  /\bgraph api\b/i,
]) {
  assert(!forbidden.test(panelMarkup),
    `owner-facing social mockup must not expose credential/API jargon matching ${forbidden}`);
}

// --- Phase A still credential-free in the browser --------------------------
assert(!/graph\.facebook\.com|instagram_content_publish|META_APP_SECRET|PAGE_ACCESS_TOKEN/i.test(adminJs),
  'browser admin JS must not call Meta APIs directly or contain Meta secrets/tokens');

console.log('Admin social mockups contract valid: live FB/IG post mockups update from editable captions, XSS-safe, credential-free.');
