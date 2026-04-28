import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const indexHtml = readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');

function fail(message) {
  console.error(`Inquiry flow validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ── Public inquiry modal markup on the storefront ──────────────────
assert(
  /<div class="product-modal inquiry-modal" id="inquiry-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="inquiry-modal-title"[^>]*aria-hidden="true"/.test(indexHtml),
  'missing accessible #inquiry-modal dialog shell'
);
assert(indexHtml.includes('id="inquiry-modal-backdrop"'), 'missing inquiry modal backdrop');
assert(indexHtml.includes('id="inquiry-modal-close"'), 'missing inquiry modal close button');
assert(indexHtml.includes('id="inquiry-form"'), 'missing inquiry form');
assert(indexHtml.includes('id="inquiry-success"'), 'missing inquiry success panel');
assert(indexHtml.includes('id="inquiry-name"'), 'missing inquiry name field');
assert(indexHtml.includes('id="inquiry-email"'), 'missing inquiry email field');
assert(indexHtml.includes('id="inquiry-message"'), 'missing inquiry message field');
assert(indexHtml.includes('id="inquiry-watch-id"'), 'missing inquiry hidden watchId field');
assert(indexHtml.includes('id="inquiry-watch-slug"'), 'missing inquiry hidden watchSlug field');

// ── Honeypot anti-spam field ───────────────────────────────────────
assert(
  /<input[^>]+id="inquiry-honeypot"[^>]+name="company"[^>]+tabindex="-1"[^>]+autocomplete="off"/.test(indexHtml),
  'inquiry form must include an off-screen honeypot input named "company" with tabindex="-1" and autocomplete="off"'
);
assert(/class="inquiry-honeypot"/.test(indexHtml), 'honeypot wrapper must be visually hidden via .inquiry-honeypot');

// ── Per-watch CTAs must use the inquiry trigger, not a primary mailto ──
assert(
  /data-inquiry-trigger[^>]+data-watch-slug=/.test(indexHtml),
  'watch CTAs must use data-inquiry-trigger buttons that carry the watch slug'
);
assert(
  /class="watch-card-inquire"[^>]+data-inquiry-trigger/.test(indexHtml),
  'watch card inquire CTA must be wired to the inquiry modal'
);
assert(
  !/class="watch-card-inquire"\s+href="mailto:/.test(indexHtml),
  'watch card inquire CTA must not be a raw mailto: link anymore'
);
assert(
  /class="btn-primary"[^>]+data-inquiry-trigger[^>]+data-inquiry-mode="this"/.test(indexHtml),
  'product modal "Inquire About This Watch" CTA must open the inquiry modal'
);
assert(
  /class="btn-primary"[^>]+data-inquiry-trigger[^>]+data-inquiry-mode="similar"/.test(indexHtml),
  'sold-state product modal "Ask About Similar References" CTA must open the inquiry modal'
);

// ── Submission wiring ──────────────────────────────────────────────
assert(
  /SUBMIT_INQUIRY_ENDPOINT\s*=\s*`\$\{SUPABASE_BASE_URL\}\/rest\/v1\/rpc\/submit_inquiry`/.test(indexHtml),
  'storefront must POST to /rest/v1/rpc/submit_inquiry'
);
assert(
  /function openInquiryModal\s*\(/.test(indexHtml),
  'missing openInquiryModal() helper'
);
assert(
  /function closeInquiryModal\s*\(/.test(indexHtml),
  'missing closeInquiryModal() helper'
);
assert(
  /function trapInquiryModalFocus\s*\(/.test(indexHtml),
  'inquiry modal must trap focus while open'
);
assert(
  /event\.key === 'Escape'[\s\S]*inquiryModal[\s\S]*closeInquiryModal\(/.test(indexHtml),
  'Escape key must close the inquiry modal'
);
assert(
  /inquiryHoneypotField\.value\.trim\(\)\.length\s*>\s*0/.test(indexHtml),
  'submit handler must drop honeypot-tripped submissions before calling Supabase'
);
assert(
  /isLikelyEmail\(email\)/.test(indexHtml),
  'submit handler must validate email before calling Supabase'
);
assert(
  /source:\s*['"]website['"]/.test(indexHtml),
  'submit handler must tag inquiries with source="website"'
);

// ── Admin Inbox markup ─────────────────────────────────────────────
assert(adminHtml.includes('id="tabpanel-inbox"'), 'admin must include #tabpanel-inbox');
assert(/id="admin-tab-inbox"[^>]+data-tab="inbox"/.test(adminHtml), 'admin must include the Inbox tab button with data-tab="inbox"');
assert(/id="admin-tab-inbox"[^>]+aria-selected="true"/.test(adminHtml), 'Inbox must be the default-selected tab');
assert(/id="admin-tab-inventory"[^>]+aria-selected="false"/.test(adminHtml), 'Inventory tab must no longer be the default selected tab');
assert(/id="tabpanel-inventory"[^>]+hidden/.test(adminHtml), 'Inventory tabpanel must be hidden by default once Inbox is the entry tab');
assert(adminHtml.includes('id="inbox-list"'), 'admin Inbox must include the inquiry list container');
assert(adminHtml.includes('id="inbox-status-filter"'), 'admin Inbox must include a status filter');
assert(adminHtml.includes('id="inbox-metrics"'), 'admin Inbox must include the metrics strip');
assert(adminHtml.includes('id="inbox-refresh-btn"'), 'admin Inbox must include a manual refresh control');

// ── Admin Inbox JS must call the three RPCs ────────────────────────
assert(
  /supabase\.rpc\(\s*['"]admin_list_inquiries['"]/.test(adminJs),
  'admin.js must call supabase.rpc("admin_list_inquiries", …)'
);
assert(
  /supabase\.rpc\(\s*['"]admin_update_inquiry_status['"]/.test(adminJs),
  'admin.js must call supabase.rpc("admin_update_inquiry_status", …)'
);
assert(
  /supabase\.rpc\(\s*['"]admin_inquiry_metrics['"]/.test(adminJs),
  'admin.js must call supabase.rpc("admin_inquiry_metrics")'
);
assert(
  /tabpanelInbox\.hidden\s*=\s*name\s*!==\s*['"]inbox['"]/.test(adminJs),
  'activateTab must hide the Inbox tabpanel when inactive'
);
assert(
  /name === ['"]inbox['"]\s*\)\s*loadInbox\(\)/.test(adminJs) ||
  /if\s*\(\s*name === ['"]inbox['"]\s*\)\s*loadInbox\(/.test(adminJs),
  'activateTab must call loadInbox() when the Inbox tab activates'
);

console.log('Inquiry flow contract valid: public form, honeypot, RPC submission, and admin Inbox are in place.');
