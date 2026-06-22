-- Watch Alley admin subscriber/newsletter dashboard metrics (2026-06-22)
--
-- The admin UI already expects public.admin_subscriber_metrics(), but the RPC
-- was not represented in migrations. Keep the shape stable for
-- public/scripts/admin.js:
--   subscribers, byCountry, bySource, recentSignups, newsletter.

create or replace function public.admin_subscriber_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with subscriber_base as (
    select
      s.id,
      s.email,
      s.first_name,
      s.country,
      s.status,
      s.first_source,
      s.last_source,
      s.source_path,
      s.created_at,
      p.subscriber_id as preferences_id
    from watch_alley.watch_list_subscribers s
    left join watch_alley.watch_list_preferences p on p.subscriber_id = s.id
  ),
  subscriber_totals as (
    select
      count(*) filter (where status = 'active') as total_active,
      count(*) filter (where status = 'unsubscribed') as total_unsubscribed,
      count(*) filter (where status = 'bounced') as total_bounced,
      count(*) filter (where status = 'active' and preferences_id is not null) as with_preferences,
      count(*) filter (where status = 'active' and preferences_id is null) as without_preferences,
      count(*) filter (
        where status = 'active'
          and nullif(trim(coalesce(first_name, '')), '') is null
          and nullif(trim(coalesce(country, '')), '') is null
          and preferences_id is null
      ) as missing_profile
    from subscriber_base
  ),
  by_country as (
    select
      coalesce(nullif(trim(country), ''), 'Unknown') as country,
      count(*) as cnt
    from subscriber_base
    where status = 'active'
    group by 1
    order by cnt desc, country asc
    limit 10
  ),
  by_source as (
    select
      coalesce(
        nullif(trim(last_source), ''),
        nullif(trim(first_source), ''),
        nullif(trim(source_path), ''),
        'unknown'
      ) as source,
      count(*) as cnt
    from subscriber_base
    where status = 'active'
    group by 1
    order by cnt desc, source asc
    limit 10
  ),
  recent_signups as (
    select
      email,
      first_name,
      country,
      created_at,
      preferences_id is not null as has_preferences
    from subscriber_base
    where status = 'active'
    order by created_at desc
    limit 5
  ),
  newsletter_totals as (
    select
      count(*) filter (where status in ('sent', 'archived')) as total_sent,
      count(*) filter (where status in ('draft', 'needs_review', 'rejected', 'failed')) as total_drafts,
      count(*) filter (where status in ('approved', 'scheduled', 'sending')) as total_queued
    from watch_alley.newsletter_issues
  )
  select jsonb_build_object(
    'subscribers', (select to_jsonb(subscriber_totals) from subscriber_totals),
    'byCountry', coalesce((select jsonb_agg(to_jsonb(by_country) order by by_country.cnt desc, by_country.country asc) from by_country), '[]'::jsonb),
    'bySource', coalesce((select jsonb_agg(to_jsonb(by_source) order by by_source.cnt desc, by_source.source asc) from by_source), '[]'::jsonb),
    'recentSignups', coalesce((select jsonb_agg(to_jsonb(recent_signups) order by recent_signups.created_at desc) from recent_signups), '[]'::jsonb),
    'newsletter', (select to_jsonb(newsletter_totals) from newsletter_totals),
    'generatedAt', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_subscriber_metrics() from public, anon;
grant execute on function public.admin_subscriber_metrics() to authenticated;

comment on function public.admin_subscriber_metrics() is
  'Admin-only Watch List and newsletter metrics for the Dashboard tab: subscriber health, profile completion, country/source splits, recent signups, and issue status counts.';
