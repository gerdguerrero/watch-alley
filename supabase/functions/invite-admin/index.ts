// invite-admin: send a Supabase Auth invite email AND record the invitee
// in watch_alley.admin_emails atomically.
//
// Why an Edge Function and not a plain RPC?
//   - auth.admin.inviteUserByEmail() is a privileged Supabase Auth API
//     that requires the service-role key. That key must never appear in
//     the browser, so we run the call here in a server context that
//     reads SUPABASE_SERVICE_ROLE_KEY from the function's env.
//
// Auth model:
//   - The function is deployed with verify_jwt=true. Supabase enforces a
//     valid JWT before our code runs, so we get the caller's identity
//     from the Authorization: Bearer <jwt> header.
//   - We then call admin_whoami() AS THE CALLER (forwarding the same
//     JWT) to confirm they're on watch_alley.admin_emails. Only admins
//     can invite more admins.
//   - Only after the allowlist check do we promote to service-role for
//     the inviteUserByEmail + admin_record_invited_email calls.
//
// Order of operations (correctness):
//   1. Verify caller JWT and admin status.
//   2. Validate request body.
//   3. Pre-record the invitee on the allowlist (idempotent upsert).
//   4. Send Supabase Auth invite email.
//   5. If the invite send fails, roll back the allowlist row (only if
//      we were the one who just inserted it — never delete an existing
//      admin's row).
//
//   Rationale: If we sent the email first and the allowlist write
//   failed, the invitee would receive an email but hit the forbidden
//   panel after accepting. Re-running the function then 409s on
//   inviteUserByEmail (already registered) and never reaches the
//   allowlist write again — a stuck state. Pre-record-then-invite
//   makes retries safe and the failure mode self-heal-able.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return json({ error: 'Missing bearer token' }, 401);
  }

  // 1. Verify caller is on the allowlist using their own JWT.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: whoami, error: whoamiError } = await callerClient.rpc('admin_whoami');
  if (whoamiError) {
    return json({ error: `whoami failed: ${whoamiError.message}` }, 500);
  }
  if (!whoami || !whoami.is_admin) {
    return json({ error: 'Caller is not an admin' }, 403);
  }
  const inviterEmail = whoami.email as string;

  // 2. Parse + validate request body.
  let body: { email?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be valid JSON' }, 400);
  }
  const targetEmail = (body.email || '').trim().toLowerCase();
  const note = body.note?.toString().slice(0, 500) || null;

  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail) || targetEmail.length > 254) {
    return json({ error: 'A valid email is required' }, 400);
  }

  // Promote to service-role for the privileged Auth API + DB upsert.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Pre-record the invitee on the allowlist. Track whether we created
  //    a fresh row (rather than upserting an existing one) so we know
  //    whether it's safe to roll back on invite failure.
  const { data: existingRow } = await adminClient
    .schema('watch_alley')
    .from('admin_emails')
    .select('email')
    .eq('email', targetEmail)
    .maybeSingle();
  const wasFreshInsert = !existingRow;

  const { error: recordError } = await adminClient.rpc('admin_record_invited_email', {
    target_email: targetEmail,
    inviter_email: inviterEmail,
    note,
  });
  if (recordError) {
    return json({ error: `Failed to record on allowlist: ${recordError.message}` }, 500);
  }

  // 4. Send the Supabase Auth invite. This emails the user a one-time link
  //    that points at the project's configured Site URL.
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(targetEmail);
  if (inviteError) {
    // Roll back the allowlist row only if we just inserted it. Never
    // remove an admin who was already there.
    if (wasFreshInsert) {
      await adminClient
        .schema('watch_alley')
        .from('admin_emails')
        .delete()
        .eq('email', targetEmail);
    }
    const status = /already.*registered|already exists/i.test(inviteError.message) ? 409 : 500;
    return json({ error: `Invite failed: ${inviteError.message}` }, status);
  }

  return json({
    ok: true,
    email: targetEmail,
    inviteSentAt: new Date().toISOString(),
    invitedBy: inviterEmail,
    user: inviteData?.user ? { id: inviteData.user.id, email: inviteData.user.email } : null,
  });
});
