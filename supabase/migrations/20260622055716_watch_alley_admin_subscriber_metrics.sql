-- Admin RPC: subscriber + newsletter analytics for the admin dashboard.
-- Called with an authenticated user token (Supabase Auth) — the is_admin()
-- guard ensures only allowlisted admins can read this data.
CREATE OR REPLACE FUNCTION public.admin_subscriber_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  result jsonb;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with subscriber_counts as (
    select
      count(*) filter (where status = 'active')        as total_active,
      count(*) filter (where status = 'unsubscribed')  as total_unsubscribed,
      count(*) filter (where status = 'bounced')       as total_bounced,
      count(*) filter (where status = 'spam')          as total_spam,
      count(*) filter (where status = 'active' and
        exists (select 1 from watch_alley.watch_list_preferences p
                where p.subscriber_id = watch_alley.watch_list_subscribers.id)
      ) as with_preferences,
      count(*) filter (where status = 'active' and
        not exists (select 1 from watch_alley.watch_list_preferences p
                    where p.subscriber_id = watch_alley.watch_list_subscribers.id)
      ) as without_preferences,
      count(*) filter (where status = 'active' and
        (first_name is null or country is null)
      ) as missing_profile
    from watch_alley.watch_list_subscribers
  ),
  by_country as (
    select
      coalesce(country, 'Unknown') as country,
      count(*) as cnt
    from watch_alley.watch_list_subscribers
    where status = 'active' and country is not null
    group by country
    order by cnt desc
    limit 10
  ),
  by_source as (
    select
      coalesce(first_source, 'unknown') as source,
      count(*) as cnt
    from watch_alley.watch_list_subscribers
    where status = 'active'
    group by first_source
    order by cnt desc
  ),
  newsletter_stats as (
    select
      count(*) filter (where status = 'sent')   as total_sent,
      count(*) filter (where status = 'draft')  as total_drafts,
      count(*) filter (where status in ('approved', 'scheduled', 'sending')) as total_queued,
      max(sent_at) filter (where status = 'sent') as last_sent_at
    from watch_alley.newsletter_issues
  ),
  recent_signups as (
    select
      email,
      coalesce(first_name, '') as first_name,
      coalesce(country, '') as country,
      coalesce(first_source, '') as source,
      created_at
    from watch_alley.watch_list_subscribers
    where status = 'active'
    order by created_at desc
    limit 5
  ),
  unsubscribe_reasons as (
    select
      coalesce(unsubscribed_reason, 'not-provided') as reason,
      count(*) as cnt
    from watch_alley.watch_list_subscribers
    where status = 'unsubscribed'
      and unsubscribed_reason is not null
    group by unsubscribed_reason
    order by cnt desc
  )
  select jsonb_build_object(
    'subscribers', (select to_jsonb(subscriber_counts) from subscriber_counts),
    'byCountry',   coalesce((select jsonb_agg(to_jsonb(by_country) order by by_country.cnt desc) from by_country), '[]'::jsonb),
    'bySource',    coalesce((select jsonb_agg(to_jsonb(by_source)   order by by_source.cnt desc)   from by_source),   '[]'::jsonb),
    'newsletter',  (select to_jsonb(newsletter_stats) from newsletter_stats),
    'recentSignups', coalesce((select jsonb_agg(to_jsonb(recent_signups) order by recent_signups.created_at desc) from recent_signups), '[]'::jsonb),
    'unsubscribeReasons', coalesce((select jsonb_agg(to_jsonb(unsubscribe_reasons) order by unsubscribe_reasons.cnt desc) from unsubscribe_reasons), '[]'::jsonb),
    'generatedAt', now()
  ) into result;

  return result;
end;
$function$;;
