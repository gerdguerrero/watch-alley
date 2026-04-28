// Inquiry lost-reason capture contract validator (Bet 2 Wave 2).
//
// Pins the schema + UI contract that turns the "lost" status from a
// black-box dismissal into a measurable demand signal.
//
// Verifies:
//   • Migration 0012 is checked in with both CHECK constraints + the new
//     admin_update_inquiry_status(uuid, text, text, text) signature.
//   • Admin JS exposes the canonical lost-reason taxonomy and renders the
//     select inside the drawer with the same values.
//   • The save handler bails on lost-without-reason BEFORE calling the RPC,
//     and forwards reason: when the operator picks lost.
//   • A change listener toggles the lost-reason select visibility when the
//     status select flips to/from 'lost'.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const adminJsPath = path.join(projectRoot, 'scripts', 'admin.js');
const migrationPath = path.join(projectRoot, 'docs', 'migrations', '0012-watch-alley-inquiry-lost-reason.sql');

function fail(message) {
  console.error(`Lost-reason contract validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ── Migration ───────────────────────────────────────────────────────
assert(existsSync(migrationPath), 'docs/migrations/0012-watch-alley-inquiry-lost-reason.sql must exist');
const migration = readFileSync(migrationPath, 'utf8');

assert(
  /add column if not exists lost_reason text/i.test(migration),
  'migration 0012 must add the lost_reason column'
);
assert(
  /constraint inquiries_lost_reason_values[\s\S]*?'price'[\s\S]*?'condition'[\s\S]*?'sold_elsewhere'[\s\S]*?'no_response'[\s\S]*?'timing'[\s\S]*?'other'/i.test(migration),
  'migration 0012 must declare inquiries_lost_reason_values CHECK with the canonical taxonomy'
);
assert(
  /constraint inquiries_lost_reason_required_when_lost[\s\S]*?status\s*=\s*'lost'\s+and\s+lost_reason\s+is\s+not\s+null/i.test(migration),
  'migration 0012 must declare inquiries_lost_reason_required_when_lost CHECK so a lost inquiry always carries a reason'
);
assert(
  /drop function if exists public\.admin_update_inquiry_status\(uuid,\s*text,\s*text\)/i.test(migration),
  'migration must drop the old (uuid, text, text) signature before recreating'
);
assert(
  /create or replace function public\.admin_update_inquiry_status\([\s\S]*?reason\s+text\s+default\s+null/i.test(migration),
  'admin_update_inquiry_status must accept a fourth `reason` parameter'
);
assert(
  /A lost reason is required when transitioning to status=lost/.test(migration),
  'admin_update_inquiry_status must reject lost transitions without a reason'
);
assert(
  /grant execute on function public\.admin_update_inquiry_status\(uuid,\s*text,\s*text,\s*text\) to authenticated/i.test(migration),
  'admin_update_inquiry_status must be executable by authenticated callers (the admin UI)'
);
assert(
  /revoke all on function public\.admin_update_inquiry_status\(uuid,\s*text,\s*text,\s*text\) from public,\s*anon/i.test(migration),
  'admin_update_inquiry_status must revoke EXECUTE from public and anon'
);

// ── Admin JS UI wiring ──────────────────────────────────────────────
assert(existsSync(adminJsPath), 'scripts/admin.js must exist');
const adminJs = readFileSync(adminJsPath, 'utf8');

assert(
  /const LOST_REASON_OPTIONS\s*=\s*\[/.test(adminJs),
  'admin.js must declare LOST_REASON_OPTIONS for the drawer dropdown'
);
for (const value of ['price', 'condition', 'sold_elsewhere', 'no_response', 'timing', 'other']) {
  assert(
    new RegExp(`value:\\s*['"]${value}['"]`).test(adminJs),
    `LOST_REASON_OPTIONS must include the canonical value "${value}"`
  );
}
assert(
  /function lostReasonLabel\s*\(/.test(adminJs),
  'admin.js must define lostReasonLabel() so the drawer can render the human label of an existing lost_reason'
);
assert(
  /data-inquiry-lost-reason="\$\{escapeAttr\(row\.id\)\}"/.test(adminJs),
  'drawer must render a select with data-inquiry-lost-reason="<inquiry-id>"'
);
assert(
  /lostReasonHidden\s*=\s*row\.status\s*!==\s*'lost'/.test(adminJs),
  'drawer must hide the lost-reason select unless the row is already in status=lost'
);
assert(
  /row\.lost_reason\s*\?\s*`<div><dt>Lost reason<\/dt>/.test(adminJs),
  'drawer must surface an existing lost_reason in the meta block'
);

// Save handler must bail on lost-without-reason BEFORE calling the RPC.
assert(
  /newStatus === 'lost'\s*&&\s*!reason/.test(adminJs),
  'save handler must guard against lost transitions without a reason before invoking the RPC'
);
assert(
  /reason:\s*newStatus === 'lost'\s*\?\s*reason\s*:\s*null/.test(adminJs),
  'save handler must forward { reason } only when newStatus is lost'
);

// Change listener toggles the visibility on status change.
assert(
  /addEventListener\(\s*['"]change['"]/.test(adminJs) &&
    /\[data-inquiry-status-select\]/.test(adminJs) &&
    /lostReasonSelect\.hidden\s*=\s*!isLost/.test(adminJs),
  'admin.js must register a change listener that toggles the lost-reason select when status flips'
);

console.log('Lost-reason contract valid: schema enforced, RPC signature correct, drawer UI conditional, save guarded.');
