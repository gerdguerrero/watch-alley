-- Explicitly revoke EXECUTE on admin write RPCs from anon.
-- The is_admin() check inside each function is the real security boundary,
-- but the advisor flags any anon-callable SECURITY DEFINER. Revoke to satisfy.
-- admin_whoami stays anon-callable on purpose so the admin UI can show
-- "you are signed in as <email> but not on the allowlist".

revoke execute on function public.admin_upsert_watch(jsonb) from anon;
revoke execute on function public.admin_delete_watch(text) from anon;
revoke execute on function public.admin_mark_watch_sold(text, text, int) from anon;

-- Make the admin_emails RLS posture explicit. RLS-enabled-no-policy already
-- means "no select/insert/update/delete for non-bypass-rls roles", but an
-- explicit deny-all policy makes intent visible to future readers.
drop policy if exists "Deny all non service" on watch_alley.admin_emails;
create policy "Deny all non service"
  on watch_alley.admin_emails
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table watch_alley.admin_emails is 'Allowlist of email addresses permitted to call public.admin_* RPCs. Read/write only via service_role (Supabase dashboard or service-role API).';;
