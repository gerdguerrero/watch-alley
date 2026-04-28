-- Watch Alley admin RPC hardening (2026-04-28)
-- Explicitly revoke EXECUTE on admin write RPCs from anon. The is_admin()
-- check inside each function is the real security boundary, but the
-- Supabase advisor flags any anon-callable SECURITY DEFINER. Revoke to
-- satisfy the advisor and surface intent in the SQL.
--
-- admin_whoami stays anon-callable on purpose so the admin UI can show
-- "you are signed in as <email> but not on the allowlist" before the
-- session token is even attached.

revoke execute on function public.admin_upsert_watch(jsonb) from anon;
revoke execute on function public.admin_delete_watch(text) from anon;
revoke execute on function public.admin_mark_watch_sold(text, text, int) from anon;

-- Make the admin_emails RLS posture explicit. RLS-enabled-no-policy already
-- means "no select/insert/update/delete for non-bypass-rls roles", but an
-- explicit deny-all policy makes intent visible to future readers and to
-- the Supabase database linter.
drop policy if exists "Deny all non service" on watch_alley.admin_emails;
create policy "Deny all non service"
  on watch_alley.admin_emails
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table watch_alley.admin_emails is 'Allowlist of email addresses permitted to call public.admin_* RPCs. Read/write only via service_role (Supabase dashboard or service-role API).';
