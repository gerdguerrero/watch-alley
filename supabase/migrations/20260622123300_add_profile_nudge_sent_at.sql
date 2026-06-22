-- Migration: Add profile_nudge_sent_at column and RPC helpers for automated nudge (2026-06-22)

alter table watch_alley.watch_list_subscribers
  add column if not exists profile_nudge_sent_at timestamptz;

-- Helper RPC to fetch candidates who need the profile nudge email (automated cron)
create or replace function public.service_get_profile_nudge_candidates(
  min_age_hours int,
  max_age_hours int
)
returns table (
  id uuid,
  email text,
  first_name text,
  country text,
  created_at timestamptz,
  missing_fields text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() and current_setting('role', true) <> 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  with candidates as (
    select 
      s.id as s_id,
      s.email as s_email,
      s.first_name as s_first_name,
      s.country as s_country,
      s.created_at as s_created_at,
      exists (
        select 1 from watch_alley.watch_list_preferences p
        where p.subscriber_id = s.id
      ) as has_prefs
    from watch_alley.watch_list_subscribers s
    where s.status = 'active'
      and s.profile_nudge_sent_at is null
      and s.created_at <= now() - (min_age_hours || ' hours')::interval
      and s.created_at >= now() - (max_age_hours || ' hours')::interval
  ),
  enriched as (
    select
      s_id,
      s_email,
      s_first_name,
      s_country,
      s_created_at,
      array[
        case when s_first_name is null or trim(s_first_name) = '' then 'First name' else null end,
        case when s_country is null or trim(s_country) = '' then 'Country' else null end,
        case when not has_prefs then 'Watch preferences (brands, budget)' else null end
      ] as raw_missing
    from candidates
  )
  select
    s_id as id,
    s_email as email,
    coalesce(s_first_name, '') as first_name,
    coalesce(s_country, '') as country,
    s_created_at as created_at,
    array(
      select x 
      from unnest(raw_missing) as x 
      where x is not null
    ) as missing_fields
  from enriched
  where exists (
    select 1 
    from unnest(raw_missing) as x 
    where x is not null
  );
end;
$$;

grant execute on function public.service_get_profile_nudge_candidates(int, int) to service_role;

-- Helper RPC to fetch candidates who need the profile nudge email (manual trigger)
create or replace function public.service_get_manual_profile_nudge_candidates(
  filter_type text
)
returns table (
  id uuid,
  email text,
  first_name text,
  country text,
  created_at timestamptz,
  missing_fields text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() and current_setting('role', true) <> 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  with candidates as (
    select 
      s.id as s_id,
      s.email as s_email,
      s.first_name as s_first_name,
      s.country as s_country,
      s.created_at as s_created_at,
      exists (
        select 1 from watch_alley.watch_list_preferences p
        where p.subscriber_id = s.id
      ) as has_prefs
    from watch_alley.watch_list_subscribers s
    where s.status = 'active'
      and (
        filter_type = 'all'
        or (filter_type = 'email-only' and (s.first_name is null or s.country is null))
        or (filter_type = 'no-preferences')
      )
  ),
  enriched as (
    select
      s_id,
      s_email,
      s_first_name,
      s_country,
      s_created_at,
      has_prefs,
      array[
        case when s_first_name is null or trim(s_first_name) = '' then 'First name' else null end,
        case when s_country is null or trim(s_country) = '' then 'Country' else null end,
        case when not has_prefs then 'Watch preferences (brands, budget)' else null end
      ] as raw_missing
    from candidates
  )
  select
    s_id as id,
    s_email as email,
    coalesce(s_first_name, '') as first_name,
    coalesce(s_country, '') as country,
    s_created_at as created_at,
    array(
      select x 
      from unnest(raw_missing) as x 
      where x is not null
    ) as missing_fields
  from enriched
  where (
    filter_type <> 'no-preferences' or not has_prefs
  )
  and exists (
    select 1 
    from unnest(raw_missing) as x 
    where x is not null
  );
end;
$$;

grant execute on function public.service_get_manual_profile_nudge_candidates(text) to service_role;

-- Helper RPC to mark a subscriber as nudged
create or replace function public.service_mark_profile_nudge_sent(subscriber_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() and current_setting('role', true) <> 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update watch_alley.watch_list_subscribers
  set profile_nudge_sent_at = now()
  where id = subscriber_id;
end;
$$;

grant execute on function public.service_mark_profile_nudge_sent(uuid) to service_role;
