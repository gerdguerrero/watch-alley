-- Redefine watch_alley.is_admin() to allow service_role access
create or replace function watch_alley.is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
begin
  if current_setting('role', true) = 'service_role' then
    return true;
  end if;

  caller_email := lower(coalesce(auth.email(), ''));
  if caller_email = '' then
    return false;
  end if;
  return exists (
    select 1 from watch_alley.admin_emails
    where lower(email) = caller_email
  );
end;
$$;

-- 1. Helper to fetch subscriber emails
create or replace function public.service_list_active_subscribers()
returns table (email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() and current_setting('role', true) <> 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select s.email
    from watch_alley.watch_list_subscribers s
    where s.status = 'active';
end;
$$;

grant execute on function public.service_list_active_subscribers() to authenticated, service_role;

-- 2. Helper to update newsletter issue status
create or replace function public.service_update_newsletter_status(
  issue_id uuid,
  new_status text,
  new_sent_at timestamptz default null,
  new_archive_visible boolean default null,
  new_metadata jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.newsletter_issues;
begin
  if not watch_alley.is_admin() and current_setting('role', true) <> 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update watch_alley.newsletter_issues
  set status = new_status,
      sent_at = coalesce(new_sent_at, sent_at),
      archive_visible = coalesce(new_archive_visible, archive_visible),
      metadata = case when new_metadata is not null then metadata || new_metadata else metadata end,
      updated_at = now()
  where id = issue_id
  returning * into result_row;

  return watch_alley.newsletter_issue_json(result_row);
end;
$$;

grant execute on function public.service_update_newsletter_status(uuid, text, timestamptz, boolean, jsonb) to authenticated, service_role;
