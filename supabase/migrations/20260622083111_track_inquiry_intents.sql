-- Watch Alley: first-party Messenger inquiry intent tracking (2026-06-22).
--
-- Public watch pages hand buyers to m.me/thewatchalley with a prefilled
-- watch-specific message. Messenger does not expose whether the visitor
-- actually pressed Send or who they are, but the site can reliably capture the
-- click intent before the redirect. Store that anonymous event separately from
-- the manually logged CRM pipeline so executive dashboard metrics stay honest:
-- intent clicks are top-of-funnel demand, watch_alley.inquiries are logged
-- conversations/outcomes.

create table if not exists watch_alley.inquiry_intents (
  id uuid primary key default gen_random_uuid(),
  watch_id text references watch_alley.watches(id) on delete set null,
  watch_slug text,
  watch_title text,
  watch_reference text,
  watch_price_php integer check (watch_price_php is null or watch_price_php >= 0),
  watch_status text check (watch_status is null or watch_status in ('available','reserved','sold')),
  channel text not null default 'messenger' check (channel = 'messenger'),
  message_text text,
  target_url text,
  source_path text,
  referrer text,
  visitor_uid text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table watch_alley.inquiry_intents is
  'Anonymous top-of-funnel click intents from watch-page Messenger CTAs. Does not imply the Messenger message was sent.';

create index if not exists inquiry_intents_created_idx
  on watch_alley.inquiry_intents (created_at desc);
create index if not exists inquiry_intents_watch_slug_idx
  on watch_alley.inquiry_intents (watch_slug);
create index if not exists inquiry_intents_visitor_uid_idx
  on watch_alley.inquiry_intents (visitor_uid)
  where visitor_uid is not null;
create index if not exists inquiry_intents_country_code_idx
  on watch_alley.inquiry_intents (country_code)
  where country_code is not null;

alter table watch_alley.inquiry_intents enable row level security;
drop policy if exists "Deny all direct access" on watch_alley.inquiry_intents;
create policy "Deny all direct access"
  on watch_alley.inquiry_intents
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.service_record_inquiry_intent(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.inquiry_intents;
  resolved_watch_id text;
  resolved_watch_slug text;
  resolved_country text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_watch_slug := nullif(left(trim(payload->>'watchSlug'), 180), '');
  resolved_watch_id := nullif(left(trim(payload->>'watchId'), 80), '');

  if resolved_watch_id is null and resolved_watch_slug is not null then
    select id into resolved_watch_id
    from watch_alley.watches
    where slug = resolved_watch_slug;
  end if;

  resolved_country := upper(nullif(left(trim(payload->>'countryCode'), 2), ''));
  if resolved_country is not null and resolved_country !~ '^[A-Z]{2}$' then
    resolved_country := null;
  end if;

  insert into watch_alley.inquiry_intents (
    watch_id,
    watch_slug,
    watch_title,
    watch_reference,
    watch_price_php,
    watch_status,
    message_text,
    target_url,
    source_path,
    referrer,
    visitor_uid,
    country_code,
    user_agent
  )
  values (
    resolved_watch_id,
    resolved_watch_slug,
    nullif(left(trim(payload->>'watchTitle'), 220), ''),
    nullif(left(trim(payload->>'watchReference'), 120), ''),
    case
      when nullif(payload->>'watchPricePhp', '') is null then null
      when (payload->>'watchPricePhp') ~ '^[0-9]{1,10}$'
        and (payload->>'watchPricePhp')::numeric <= 2147483647
        then (payload->>'watchPricePhp')::integer
      else null
    end,
    case
      when nullif(left(trim(payload->>'watchStatus'), 24), '') in ('available','reserved','sold')
        then nullif(left(trim(payload->>'watchStatus'), 24), '')
      else null
    end,
    nullif(left(payload->>'messageText', 2000), ''),
    nullif(left(trim(payload->>'targetUrl'), 1000), ''),
    nullif(left(trim(payload->>'sourcePath'), 500), ''),
    nullif(left(trim(payload->>'referrer'), 1000), ''),
    nullif(left(trim(payload->>'visitorUid'), 80), ''),
    resolved_country,
    nullif(left(trim(payload->>'userAgent'), 500), '')
  )
  returning * into result_row;

  return jsonb_build_object('tracked', true, 'id', result_row.id);
end;
$$;

revoke all on function public.service_record_inquiry_intent(jsonb) from public, anon, authenticated;
grant execute on function public.service_record_inquiry_intent(jsonb) to service_role;

comment on function public.service_record_inquiry_intent(jsonb) is
  'Service-role-only logger for anonymous Messenger inquiry-intent clicks from public watch pages.';

create or replace function public.admin_dashboard_metrics()
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

  with intent_totals as (
    select
      count(*) filter (where created_at >= now() - interval '7 days') as last7,
      count(*) filter (where created_at >= now() - interval '30 days') as last30,
      count(*) filter (where created_at >= now() - interval '90 days') as last90,
      count(*) as all_time,
      count(distinct visitor_uid) filter (
        where created_at >= now() - interval '7 days'
          and visitor_uid is not null
      ) as unique_last7,
      count(distinct visitor_uid) filter (
        where created_at >= now() - interval '30 days'
          and visitor_uid is not null
      ) as unique_last30
    from watch_alley.inquiry_intents
  ),
  inquiry_totals as (
    select
      count(*) filter (where created_at >= now() - interval '7 days')  as last7,
      count(*) filter (where created_at >= now() - interval '30 days') as last30,
      count(*)                                                          as all_time,
      count(*) filter (where status = 'new')                            as open_new,
      count(*) filter (where status = 'contacted')                      as open_contacted,
      count(*) filter (where status = 'viewing')                        as open_viewing,
      count(*) filter (where status = 'reserved')                       as open_reserved,
      count(*) filter (where status = 'sold')                           as won_total,
      count(*) filter (where status = 'lost')                           as lost_total,
      count(*) filter (where status = 'sold' and closed_at >= now() - interval '30 days') as won_30
    from watch_alley.inquiries
  ),
  reply_sla as (
    select
      percentile_cont(0.5) within group (
        order by extract(epoch from (responded_at - created_at))
      ) as median_seconds,
      count(*) filter (where responded_at is not null) as replied_count,
      count(*) as inquiry_count
    from watch_alley.inquiries
    where created_at >= now() - interval '30 days'
  ),
  conversion as (
    select
      count(*) filter (where status = 'sold' and closed_at >= now() - interval '30 days') as won,
      count(*) filter (where status in ('sold','lost') and closed_at >= now() - interval '30 days') as closed
    from watch_alley.inquiries
  ),
  top_watches as (
    select
      coalesce(ii.watch_slug, w.slug) as slug,
      coalesce(
        nullif(ii.watch_title, ''),
        nullif(trim(coalesce(w.brand, '') || ' ' || coalesce(w.name, '')), ''),
        ii.watch_slug,
        'Unknown listing'
      ) as label,
      count(*) as intents,
      count(*) as inquiries,
      count(distinct ii.visitor_uid) filter (where ii.visitor_uid is not null) as visitors
    from watch_alley.inquiry_intents ii
    left join watch_alley.watches w
      on w.id = ii.watch_id
      or (ii.watch_id is null and ii.watch_slug is not null and w.slug = ii.watch_slug)
    where ii.created_at >= now() - interval '90 days'
    group by
      coalesce(ii.watch_slug, w.slug),
      coalesce(
        nullif(ii.watch_title, ''),
        nullif(trim(coalesce(w.brand, '') || ' ' || coalesce(w.name, '')), ''),
        ii.watch_slug,
        'Unknown listing'
      )
    order by intents desc
    limit 5
  ),
  lost_reasons as (
    select
      coalesce(lost_reason, 'unspecified') as reason,
      count(*) as losses
    from watch_alley.inquiries
    where status = 'lost'
      and closed_at >= now() - interval '90 days'
    group by 1
    order by losses desc
  ),
  inventory as (
    select
      count(*)                                            as total,
      count(*) filter (where published)                   as published,
      count(*) filter (where not published)               as drafts,
      count(*) filter (where status = 'available' and published) as available,
      count(*) filter (where status = 'reserved' and published)  as reserved,
      count(*) filter (where status = 'sold')             as sold_all_time,
      count(*) filter (where status = 'sold'
                         and sold_at = to_char(now(), 'YYYY-MM')) as sold_this_month
    from watch_alley.watches
  ),
  journal as (
    select
      count(*) filter (where status = 'published') as published,
      count(*) filter (where status = 'draft')     as drafts,
      count(*) filter (where status = 'scheduled') as scheduled,
      max(published_at) filter (where status = 'published') as latest_published_at
    from watch_alley.journal_posts
  ),
  latest_journal as (
    select title, slug, published_at
    from watch_alley.journal_posts
    where status = 'published'
      and published_at is not null
    order by published_at desc
    limit 1
  ),
  activity as (
    (
      select
        'intent' as kind,
        ii.created_at as at,
        'Messenger click for ' || coalesce(nullif(ii.watch_title, ''), w.name, ii.watch_slug, 'a listing') as label,
        coalesce(ii.watch_slug, w.slug) as slug
      from watch_alley.inquiry_intents ii
      left join watch_alley.watches w
        on w.id = ii.watch_id
        or (ii.watch_id is null and ii.watch_slug is not null and w.slug = ii.watch_slug)
      where ii.created_at >= now() - interval '14 days'
      order by ii.created_at desc
      limit 6
    )
    union all
    (
      select
        'inquiry' as kind,
        i.created_at as at,
        coalesce(i.buyer_name, 'Anonymous') || ' logged for ' || coalesce(w.name, 'a piece') as label,
        w.slug as slug
      from watch_alley.inquiries i
      left join watch_alley.watches w on w.id = i.watch_id
      where i.created_at >= now() - interval '14 days'
      order by i.created_at desc
      limit 4
    )
    union all
    (
      select
        'sold' as kind,
        coalesce(i.closed_at, i.updated_at) as at,
        coalesce(w.brand || ' ', '') || coalesce(w.name, 'a piece') || ' marked sold' as label,
        w.slug as slug
      from watch_alley.inquiries i
      left join watch_alley.watches w on w.id = i.watch_id
      where i.status = 'sold'
        and coalesce(i.closed_at, i.updated_at) >= now() - interval '30 days'
      order by coalesce(i.closed_at, i.updated_at) desc
      limit 4
    )
    union all
    (
      select
        'journal' as kind,
        p.published_at as at,
        '"' || p.title || '" published' as label,
        p.slug as slug
      from watch_alley.journal_posts p
      where p.status = 'published'
        and p.published_at >= now() - interval '30 days'
      order by p.published_at desc
      limit 3
    )
  ),
  activity_sorted as (
    select * from activity
    where at is not null
    order by at desc
    limit 10
  )
  select jsonb_build_object(
    'intent', (select to_jsonb(intent_totals) from intent_totals),
    'inquiries', (select to_jsonb(inquiry_totals) from inquiry_totals),
    'replySla',  (select jsonb_build_object(
                    'medianSeconds', median_seconds,
                    'repliedCount', replied_count,
                    'inquiryCount', inquiry_count
                  ) from reply_sla),
    'conversion', (select to_jsonb(conversion) from conversion),
    'topWatches', coalesce((select jsonb_agg(to_jsonb(top_watches) order by top_watches.intents desc) from top_watches), '[]'::jsonb),
    'lostReasons', coalesce((select jsonb_agg(to_jsonb(lost_reasons) order by lost_reasons.losses desc) from lost_reasons), '[]'::jsonb),
    'inventory', (select to_jsonb(inventory) from inventory),
    'journal',   (select to_jsonb(journal) || jsonb_build_object(
                    'latestTitle', (select title from latest_journal),
                    'latestSlug', (select slug from latest_journal),
                    'latestPublishedAt', (select published_at from latest_journal)
                  ) from journal),
    'activity',  coalesce((select jsonb_agg(to_jsonb(activity_sorted) order by activity_sorted.at desc) from activity_sorted), '[]'::jsonb),
    'generatedAt', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;

comment on function public.admin_dashboard_metrics() is
  'Single-payload metrics for the admin Dashboard tab. Separates anonymous Messenger inquiry intent from manually logged CRM inquiries and outcomes.';
