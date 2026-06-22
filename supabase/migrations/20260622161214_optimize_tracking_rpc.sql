-- Watch Alley: consolidate hot-path tracking writes.
--
-- Public watch pages call a Next.js route, and that route uses service_role to
-- invoke this RPC. Keeping the counter mutations in Postgres reduces Vercel ->
-- Supabase round trips and makes concurrent increments atomic.

alter table public.watch_page_views
  add column if not exists views_24h_started_at timestamptz,
  add column if not exists views_7d_started_at timestamptz;

update public.watch_page_views
set
  views_24h_started_at = coalesce(views_24h_started_at, window_started_at, last_viewed_at, now()),
  views_7d_started_at = coalesce(views_7d_started_at, window_started_at, last_viewed_at, now())
where views_24h_started_at is null
   or views_7d_started_at is null;

alter table public.watch_page_views
  alter column views_24h_started_at set default now(),
  alter column views_7d_started_at set default now(),
  alter column views_24h_started_at set not null,
  alter column views_7d_started_at set not null;

alter table public.visitor_countries
  add column if not exists views_24h_started_at timestamptz,
  add column if not exists views_7d_started_at timestamptz;

update public.visitor_countries
set
  views_24h_started_at = coalesce(views_24h_started_at, window_started_at, last_seen_at, now()),
  views_7d_started_at = coalesce(views_7d_started_at, window_started_at, last_seen_at, now())
where views_24h_started_at is null
   or views_7d_started_at is null;

alter table public.visitor_countries
  alter column views_24h_started_at set default now(),
  alter column views_7d_started_at set default now(),
  alter column views_24h_started_at set not null,
  alter column views_7d_started_at set not null;

create or replace function public.service_record_watch_visit(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_at timestamptz := now();
  resolved_slug text;
  resolved_country text;
  resolved_uid text;
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_record_watch_visit is service_role only' using errcode = '42501';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_slug := nullif(left(trim(payload->>'slug'), 180), '');
  if resolved_slug is null then
    raise exception 'slug is required' using errcode = '22023';
  end if;

  insert into public.watch_page_views as views (
    slug,
    view_count,
    views_24h,
    views_7d,
    window_started_at,
    views_24h_started_at,
    views_7d_started_at,
    first_viewed_at,
    last_viewed_at
  )
  values (
    resolved_slug,
    1,
    1,
    1,
    now_at,
    now_at,
    now_at,
    now_at,
    now_at
  )
  on conflict (slug) do update
  set
    view_count = views.view_count + 1,
    views_24h = case
      when now_at - coalesce(views.views_24h_started_at, views.window_started_at, views.last_viewed_at) >= interval '24 hours'
        then 1
      else views.views_24h + 1
    end,
    views_7d = case
      when now_at - coalesce(views.views_7d_started_at, views.window_started_at, views.last_viewed_at) >= interval '7 days'
        then 1
      else views.views_7d + 1
    end,
    window_started_at = case
      when now_at - coalesce(views.views_24h_started_at, views.window_started_at, views.last_viewed_at) >= interval '24 hours'
        then now_at
      else views.window_started_at
    end,
    views_24h_started_at = case
      when now_at - coalesce(views.views_24h_started_at, views.window_started_at, views.last_viewed_at) >= interval '24 hours'
        then now_at
      else coalesce(views.views_24h_started_at, views.window_started_at, views.last_viewed_at)
    end,
    views_7d_started_at = case
      when now_at - coalesce(views.views_7d_started_at, views.window_started_at, views.last_viewed_at) >= interval '7 days'
        then now_at
      else coalesce(views.views_7d_started_at, views.window_started_at, views.last_viewed_at)
    end,
    last_viewed_at = now_at;

  resolved_country := upper(nullif(left(trim(payload->>'countryCode'), 2), ''));
  if resolved_country is not null and resolved_country !~ '^[A-Z]{2}$' then
    resolved_country := null;
  end if;

  if resolved_country is not null then
    insert into public.visitor_countries as countries (
      country,
      visitor_count,
      views_24h,
      views_7d,
      window_started_at,
      views_24h_started_at,
      views_7d_started_at,
      first_seen_at,
      last_seen_at
    )
    values (
      resolved_country,
      1,
      1,
      1,
      now_at,
      now_at,
      now_at,
      now_at,
      now_at
    )
    on conflict (country) do update
    set
      visitor_count = countries.visitor_count + 1,
      views_24h = case
        when now_at - coalesce(countries.views_24h_started_at, countries.window_started_at, countries.last_seen_at) >= interval '24 hours'
          then 1
        else countries.views_24h + 1
      end,
      views_7d = case
        when now_at - coalesce(countries.views_7d_started_at, countries.window_started_at, countries.last_seen_at) >= interval '7 days'
          then 1
        else countries.views_7d + 1
      end,
      window_started_at = case
        when now_at - coalesce(countries.views_24h_started_at, countries.window_started_at, countries.last_seen_at) >= interval '24 hours'
          then now_at
        else countries.window_started_at
      end,
      views_24h_started_at = case
        when now_at - coalesce(countries.views_24h_started_at, countries.window_started_at, countries.last_seen_at) >= interval '24 hours'
          then now_at
        else coalesce(countries.views_24h_started_at, countries.window_started_at, countries.last_seen_at)
      end,
      views_7d_started_at = case
        when now_at - coalesce(countries.views_7d_started_at, countries.window_started_at, countries.last_seen_at) >= interval '7 days'
          then now_at
        else coalesce(countries.views_7d_started_at, countries.window_started_at, countries.last_seen_at)
      end,
      last_seen_at = now_at;
  end if;

  resolved_uid := nullif(left(trim(payload->>'uid'), 80), '');
  if resolved_uid is not null and resolved_uid !~* '^[0-9a-f-]{32,40}$' then
    resolved_uid := null;
  end if;

  if resolved_uid is not null then
    insert into public.visitor_ids as visitors (
      uid,
      first_seen_at,
      last_seen_at
    )
    values (
      resolved_uid,
      now_at,
      now_at
    )
    on conflict (uid) do update
    set last_seen_at = excluded.last_seen_at;
  end if;

  return jsonb_build_object(
    'tracked', true,
    'slug', resolved_slug,
    'countryTracked', resolved_country is not null,
    'visitorTracked', resolved_uid is not null
  );
end;
$$;

revoke all on function public.service_record_watch_visit(jsonb) from public, anon, authenticated;
grant execute on function public.service_record_watch_visit(jsonb) to service_role;

comment on function public.service_record_watch_visit(jsonb) is
  'Service-role-only atomic logger for public watch page views, visitor countries, and anonymous visitor ids.';
