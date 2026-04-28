-- Watch Alley admin dashboard metrics RPC (2026-04-29).
--
-- One JSON-returning function so the admin landing page can populate every
-- KPI tile in a single round-trip. Heritage atelier register: each tile is
-- a single Petrona figure with a JetBrains Mono label, so the data shape is
-- "label + value" everywhere. Extras (top inquired watches, lost reasons,
-- recent activity) are arrays the client iterates.
--
-- Idempotent. Safe to re-run.

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

  with inquiry_totals as (
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
    -- Median time from inquiry created_at to first responded_at, last 30 days.
    -- Computed in seconds so the client can format. NULL if no replied
    -- inquiries in the window.
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
    -- Closed = won OR lost in the last 30 days. Win rate = won / closed.
    select
      count(*) filter (where status = 'sold' and closed_at >= now() - interval '30 days') as won,
      count(*) filter (where status in ('sold','lost') and closed_at >= now() - interval '30 days') as closed
    from watch_alley.inquiries
  ),
  top_watches as (
    select
      i.watch_id,
      coalesce(w.brand, '') || coalesce(' ' || w.name, '') as label,
      w.slug,
      count(*) as inquiries,
      count(*) filter (where i.status = 'sold') as won
    from watch_alley.inquiries i
    left join watch_alley.watches w on w.id = i.watch_id
    where i.created_at >= now() - interval '90 days'
      and i.watch_id is not null
    group by i.watch_id, w.brand, w.name, w.slug
    order by inquiries desc
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
      count(*) filter (where status = 'scheduled') as scheduled
    from watch_alley.journal_posts
  ),
  -- Recent activity feed: union of recent inquiries, status changes,
  -- published watches, and published journal posts. Each row carries a
  -- label, a kind (so the client can pick an icon/eyebrow), and a slug
  -- where applicable so the row can deep-link.
  activity as (
    (
      select
        'inquiry' as kind,
        i.created_at as at,
        coalesce(i.buyer_name, 'Anonymous') || ' asked about ' || coalesce(w.name, 'a piece') as label,
        w.slug as slug
      from watch_alley.inquiries i
      left join watch_alley.watches w on w.id = i.watch_id
      where i.created_at >= now() - interval '14 days'
      order by i.created_at desc
      limit 6
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
    'inquiries', (select to_jsonb(inquiry_totals) from inquiry_totals),
    'replySla',  (select jsonb_build_object(
                    'medianSeconds', median_seconds,
                    'repliedCount', replied_count,
                    'inquiryCount', inquiry_count
                  ) from reply_sla),
    'conversion', (select to_jsonb(conversion) from conversion),
    'topWatches', coalesce((select jsonb_agg(to_jsonb(top_watches) order by top_watches.inquiries desc) from top_watches), '[]'::jsonb),
    'lostReasons', coalesce((select jsonb_agg(to_jsonb(lost_reasons) order by lost_reasons.losses desc) from lost_reasons), '[]'::jsonb),
    'inventory', (select to_jsonb(inventory) from inventory),
    'journal',   (select to_jsonb(journal) from journal),
    'activity',  coalesce((select jsonb_agg(to_jsonb(activity_sorted) order by activity_sorted.at desc) from activity_sorted), '[]'::jsonb),
    'generatedAt', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;

comment on function public.admin_dashboard_metrics() is
  'Single-payload metrics for the admin Dashboard tab. KPI counts, reply-time SLA, conversion rate, top inquired watches, lost-reason breakdown, inventory snapshot, journal status, and a recent-activity feed of the last 10 events.';
