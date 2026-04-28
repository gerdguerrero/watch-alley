-- Watch Alley admin allowlist management RPCs (2026-04-28).
-- Pairs with the invite-admin Edge Function for full add/list/remove flow.

create or replace function public.admin_list_admin_emails()
returns table (email text, added_at timestamptz, note text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
    select e.email, e.added_at, e.note
    from watch_alley.admin_emails e
    order by e.added_at asc;
end;
$$;
revoke all on function public.admin_list_admin_emails() from public, anon;
grant execute on function public.admin_list_admin_emails() to authenticated;

-- Refuses to remove the calling admin (no self-deletion) and the last admin
-- (no bricking the system).
create or replace function public.admin_remove_admin_email(target_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  normalized text;
  remaining int;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'target_email is required' using errcode = '22023';
  end if;

  caller_email := lower(coalesce(auth.email(), ''));
  normalized := lower(trim(target_email));

  if normalized = caller_email then
    raise exception 'Cannot remove yourself from the admin allowlist' using errcode = '42501';
  end if;

  select count(*) into remaining
  from watch_alley.admin_emails
  where lower(email) <> normalized;
  if remaining < 1 then
    raise exception 'Cannot remove the last admin' using errcode = '42501';
  end if;

  delete from watch_alley.admin_emails where lower(email) = normalized;
  return found;
end;
$$;
revoke all on function public.admin_remove_admin_email(text) from public, anon;
grant execute on function public.admin_remove_admin_email(text) to authenticated;

-- Helper used by the invite-admin Edge Function to record the allowlist
-- entry atomically with auth.admin.inviteUserByEmail(). Service-role only —
-- the Edge Function performs the caller-identity check before calling this.
create or replace function public.admin_record_invited_email(
  target_email text,
  inviter_email text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text;
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  normalized := lower(trim(target_email));
  if normalized = '' or normalized is null then
    raise exception 'target_email is required' using errcode = '22023';
  end if;

  insert into watch_alley.admin_emails (email, note)
  values (normalized, coalesce(note, 'Invited by ' || coalesce(inviter_email, 'service_role')))
  on conflict (email) do update set
    note = coalesce(excluded.note, watch_alley.admin_emails.note);
end;
$$;
revoke all on function public.admin_record_invited_email(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_record_invited_email(text, text, text) to service_role;
