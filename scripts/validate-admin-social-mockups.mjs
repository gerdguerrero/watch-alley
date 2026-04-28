// Compact "Preview & limits" panel contract.
//
// Replaces the previous Facebook + Instagram impersonation mockups (off-brand
// white chrome with fake Like/Comment/Share/Send toolbars and a faked IG
// 'more' truncation). The new surface is a single brand-aligned summary
// panel that shows the operator what is actually useful pre-flight: the
// cover photo, character + hashtag counts vs. caps, and the destination
// URL the post will deep-link to.
//
// This file PINS the new shape. The fake-chrome mockups must stay removed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(projectRoot, rel), 'utf8');
}
function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const adminHtml = read('admin/index.html');
const adminJs = read('scripts/admin.js');
const adminCss = read('styles/admin.css');

// ── The off-brand impersonation mockups must stay removed ────────────────
const bannedHtml = [
  'social-mockup-row',
  'social-fb-mockup',
  'social-ig-mockup',
  'social-mockup-action',
  'social-mockup-engagement',
  'social-mockup-likes',
  'data-mockup="facebook"',
  'data-mockup="instagram"',
];
for (const banned of bannedHtml) {
  assert(!adminHtml.includes(banned), `the off-brand impersonation mockup must stay removed (found "${banned}" in admin HTML)`);
}
const bannedCss = [
  '.social-mockup-row',
  '.social-mockup-actions',
  '.social-mockup-page-name',
  '.social-mockup-engagement',
];
for (const banned of bannedCss) {
  assert(!adminCss.includes(banned), `the off-brand impersonation mockup CSS must stay removed (found "${banned}" in admin CSS)`);
}
const bannedJs = ['renderSocialMockups', 'socialFbMockup', 'socialIgMockup', 'applyMockupImage', 'IG_TRUNCATION_CHARS'];
for (const banned of bannedJs) {
  assert(!adminJs.includes(banned), `the off-brand impersonation mockup JS must stay removed (found "${banned}" in admin.js)`);
}

// ── New panel markup ──────────────────────────────────────────────────────
const panelStart = adminHtml.indexOf('id="social-preview-summary"');
assert(panelStart !== -1, 'admin must declare a #social-preview-summary panel');
const panelEnd = adminHtml.indexOf('</aside>', panelStart);
assert(panelEnd !== -1, 'social-preview-summary must close with </aside>');
const panelMarkup = adminHtml.slice(panelStart, panelEnd);

for (const id of [
  'social-preview-summary-image',
  'social-preview-summary-photo-empty',
  'social-preview-summary-fb',
  'social-preview-summary-ig',
  'social-preview-summary-link-anchor',
]) {
  assert(panelMarkup.includes(`id="${id}"`), `summary panel must include #${id}`);
}
for (const target of ['fb-chars', 'fb-state', 'ig-chars', 'ig-tags', 'ig-state']) {
  assert(
    new RegExp(`data-target="${target}"`).test(panelMarkup),
    `summary panel must include a data-target="${target}" placeholder`
  );
}
assert(/Preview &amp; limits/i.test(panelMarkup), 'panel must carry the "Preview & limits" eyebrow');
assert(/Destination link/i.test(panelMarkup), 'panel must label the destination URL line');

// ── CSS register ──────────────────────────────────────────────────────────
assert(/\.social-preview-summary\s*\{/.test(adminCss), '.social-preview-summary base style must exist');
assert(/\.social-preview-summary-counts\s*\{/.test(adminCss), '.social-preview-summary-counts list style must exist');
assert(/\.social-preview-summary-counts li\[data-state="over"\]/.test(adminCss), 'panel must style the over-limit row state');
assert(/JetBrains Mono/.test(adminCss), 'panel CSS must use JetBrains Mono for the labels (heritage admin register)');

// ── JS contract ───────────────────────────────────────────────────────────
assert(/function\s+renderSocialPreviewSummary\s*\(/.test(adminJs), 'admin.js must define renderSocialPreviewSummary()');
assert(/function\s+countHashtags\s*\(/.test(adminJs), 'admin.js must define countHashtags() for the IG counter');
assert(/SOCIAL_LIMITS\s*=\s*\{[\s\S]*?facebook:\s*\{\s*chars:\s*63206/.test(adminJs), 'SOCIAL_LIMITS must include the FB char cap (63,206)');
assert(/instagram:\s*\{\s*chars:\s*2200,\s*hashtags:\s*30/.test(adminJs), 'SOCIAL_LIMITS must include the IG char + hashtag caps (2,200 / 30)');
assert(/SAFE_MOCKUP_IMAGE_SCHEME\s*=\s*\/\^\(https/.test(adminJs), 'image src must still go through the scheme allowlist regex');
assert(/imgEl\.onerror\s*=/.test(adminJs), 'image preview must still wire an onerror handler that falls back to the placeholder');

// Live updates: typing into either textarea must refresh the summary.
assert(
  /socialFacebookCaption[\s\S]{0,200}addEventListener\(\s*['"]input['"]\s*,\s*\(\)\s*=>\s*renderSocialPreviewSummary\(\)\s*\)/m.test(adminJs),
  'Facebook caption textarea must call renderSocialPreviewSummary() on input'
);
assert(
  /socialInstagramCaption[\s\S]{0,200}addEventListener\(\s*['"]input['"]\s*,\s*\(\)\s*=>\s*renderSocialPreviewSummary\(\)\s*\)/m.test(adminJs),
  'Instagram caption textarea must call renderSocialPreviewSummary() on input'
);
// Generating a preview / clearing must also re-render the summary.
assert(/renderSocialPreviewFromForm[\s\S]*?renderSocialPreviewSummary\s*\(/m.test(adminJs), 'renderSocialPreviewFromForm must call renderSocialPreviewSummary so generating updates the summary');
assert(/clearSocialPreview[\s\S]*?renderSocialPreviewSummary\s*\(/m.test(adminJs), 'clearSocialPreview must call renderSocialPreviewSummary so the summary clears with the captions');

// Destination link must use buildPublicWatchUrl so the URL stays canonical.
assert(/buildPublicWatchUrl\(slug\)/.test(adminJs), 'destination link must come from buildPublicWatchUrl(slug)');

// ── Credential-free posture stays intact ─────────────────────────────────
for (const forbidden of [
  /facebook\/instagram password/i,
  /\baccess[-\s]?token\b/i,
  /\bapi secret\b/i,
  /\bgraph api\b/i,
]) {
  assert(!forbidden.test(panelMarkup), `owner-facing summary panel must not expose credential/API jargon matching ${forbidden}`);
}
assert(!/graph\.facebook\.com|instagram_content_publish|META_APP_SECRET|PAGE_ACCESS_TOKEN/i.test(adminJs), 'browser admin JS must not call Meta APIs directly or contain Meta secrets/tokens');

console.log('Admin social preview-summary contract valid: brand-aligned panel with photo + char/hashtag limits + destination link, no impersonation chrome.');
