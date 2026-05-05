// Admin auth + password recovery contract validator.
//
// Keeps the admin password reset flow safe, operator-friendly, and aligned
// with Supabase Auth's resetPasswordForEmail -> PASSWORD_RECOVERY -> updateUser
// pattern.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const adminHtml = readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
const adminJs = readFileSync(path.join(projectRoot, 'scripts', 'admin.js'), 'utf8');

function fail(message) {
  console.error(`Admin auth validation failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }

assert(/id="auth-forgot-btn"/.test(adminHtml), 'sign-in panel must include a Forgot password button');
assert(/id="password-setup-panel"[\s\S]*id="password-setup-new"[\s\S]*id="password-setup-confirm"/.test(adminHtml), 'password recovery must land on the password setup panel');
assert(/function normalizeEmail\s*\(/.test(adminJs), 'admin auth must normalize email input');
assert(/function isValidEmail\s*\(/.test(adminJs), 'admin auth must validate email shape before reset/invite');
assert(/function getAdminRedirectTo\s*\(/.test(adminJs) && /window\.location\.origin[\s\S]*\/admin/.test(adminJs), 'password reset redirect must return users to /admin');
assert(/function sendPasswordResetEmail\s*\(/.test(adminJs), 'admin auth must centralize reset email sending');
assert(/resetPasswordForEmail\(\s*normalized[\s\S]*redirectTo:\s*getAdminRedirectTo\(\)/.test(adminJs), 'reset email must use Supabase resetPasswordForEmail with /admin redirect');
assert(/PASSWORD_RECOVERY/.test(adminJs), 'admin auth must listen for Supabase PASSWORD_RECOVERY events');
assert(/updateUser\(\s*\{\s*password:\s*newPassword\s*\}\s*\)/.test(adminJs), 'password setup must update the Supabase Auth password');
assert(/passwordResetSuccessMessage/.test(adminJs), 'reset flow must use non-enumerating success copy');
assert(!/Reset email sent to/.test(adminJs), 'reset copy must not imply whether a user exists');
assert(/data-reset-email/.test(adminJs), 'Admins list must include a send-reset action for allowlisted admins');
assert(/button\[data-reset-email\]/.test(adminJs), 'Admins list click handler must handle send-reset buttons');
assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(adminJs), 'browser admin JS must never reference service-role secrets');

console.log('Admin auth contract valid: forgot-password email, recovery password setup, and admin-triggered reset are wired safely.');
