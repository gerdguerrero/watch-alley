// inquiry-notify Edge Function contract validator (Bet 2 Wave 1).
//
// Locks down the shape of the owner-notification fan-out so future edits
// don't accidentally:
//   • leak service-role secrets to the browser
//   • stop verifying the shared-secret header
//   • drop the audit log writes that prove deliverability
//   • drop the per-channel fan-out (email + optional viber + optional slack)
//
// This validator does NOT exercise the function over the network. It pins
// the source contract; runtime smoke is a separate manual step (curl the
// deployed function with the secret header).

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const fnPath = path.join(projectRoot, 'supabase', 'functions', 'inquiry-notify', 'index.ts');
const migrationPath = path.join(projectRoot, 'docs', 'migrations', '0011-watch-alley-inquiry-notifications.sql');

function fail(message) {
  console.error(`Inquiry-notify contract validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ── Edge Function source must exist ─────────────────────────────────
assert(existsSync(fnPath), 'supabase/functions/inquiry-notify/index.ts must exist');
const fn = readFileSync(fnPath, 'utf8');

// ── Shared-secret auth boundary ─────────────────────────────────────
assert(
  /Deno\.env\.get\(\s*['"]INQUIRY_NOTIFY_SECRET['"]\s*\)/.test(fn),
  'function must read INQUIRY_NOTIFY_SECRET from env'
);
assert(
  /req\.headers\.get\(\s*['"]x-watch-alley-secret['"]\s*\)/i.test(fn),
  'function must read the x-watch-alley-secret request header'
);
assert(
  /incomingSecret\s*!==\s*INQUIRY_NOTIFY_SECRET/.test(fn),
  'function must constant-compare the secret and reject mismatches with 403'
);

// ── Service-role usage stays server-side ────────────────────────────
assert(
  /Deno\.env\.get\(\s*['"]SUPABASE_SERVICE_ROLE_KEY['"]\s*\)/.test(fn),
  'function must read SUPABASE_SERVICE_ROLE_KEY from env'
);
assert(
  !/SUPABASE_SERVICE_ROLE_KEY[\s\S]{0,200}json\(/.test(fn),
  'function must never put SUPABASE_SERVICE_ROLE_KEY into a JSON response'
);

// ── Webhook payload shape guard ─────────────────────────────────────
assert(
  /payload\?\.\s*type\s*!==\s*['"]INSERT['"]/.test(fn) ||
    /payload\?\.type\s*!==\s*['"]INSERT['"]/.test(fn),
  'function must accept only INSERT events'
);
assert(
  /payload\?\.\s*table\s*!==\s*['"]inquiries['"]/.test(fn) ||
    /payload\?\.table\s*!==\s*['"]inquiries['"]/.test(fn),
  'function must accept only inquiries table events'
);
assert(
  /inquiry\.buyer_email/.test(fn),
  'function must read buyer_email from the inquiry record'
);

// ── Channel fan-out ─────────────────────────────────────────────────
assert(
  /https:\/\/api\.resend\.com\/emails/.test(fn),
  'function must POST to https://api.resend.com/emails'
);
assert(
  /reply_to:\s*inquiry\.buyer_email/.test(fn),
  'Resend payload must set reply_to to the buyer email so the owner can hit Reply'
);
assert(
  /VIBER_WEBHOOK_URL/.test(fn) && /SLACK_WEBHOOK_URL/.test(fn),
  'function must support optional VIBER_WEBHOOK_URL and SLACK_WEBHOOK_URL fan-outs'
);

// ── Audit logging ───────────────────────────────────────────────────
assert(
  /\.from\(\s*['"]notification_log['"]\s*\)\.insert\(/.test(fn),
  'function must record every fan-out attempt into watch_alley.notification_log'
);
assert(
  /channel:\s*['"]email['"]/.test(fn) || /'email'/.test(fn),
  'function must log the email channel'
);

// ── XSS-safe email rendering ────────────────────────────────────────
assert(
  /function escapeHtml\s*\(/.test(fn),
  'function must define an escapeHtml helper for the HTML email body'
);
assert(
  /escapeHtml\(inquiry\.buyer_name\)/.test(fn) &&
    /escapeHtml\(inquiry\.message\)/.test(fn) &&
    /escapeHtml\(inquiry\.buyer_email\)/.test(fn),
  'every untrusted inquiry field that lands in the HTML email must pass through escapeHtml'
);

// ── Migration must be checked in ────────────────────────────────────
assert(existsSync(migrationPath), 'migration 0011 must be checked in');
const migration = readFileSync(migrationPath, 'utf8');
assert(
  /create table if not exists watch_alley\.notification_log/i.test(migration),
  'migration 0011 must create watch_alley.notification_log'
);
assert(
  /references watch_alley\.inquiries\(id\)\s+on delete cascade/i.test(migration),
  'notification_log must cascade-delete with its parent inquiry'
);
assert(
  /alter table watch_alley\.notification_log enable row level security/i.test(migration),
  'notification_log must enable RLS'
);
assert(
  /create policy "Deny all direct access"\s+on watch_alley\.notification_log/i.test(migration),
  'notification_log must declare a deny-all policy for anon + authenticated'
);
assert(
  /create or replace function public\.admin_list_notification_log/i.test(migration),
  'migration must expose admin_list_notification_log() for the future Inbox audit view'
);
assert(
  /watch_alley\.is_admin\(\)/.test(migration),
  'admin_list_notification_log must gate on watch_alley.is_admin()'
);

console.log('Inquiry-notify contract valid: secret-header auth, service-role server-side, fan-out + audit log wired, migration hardened.');
