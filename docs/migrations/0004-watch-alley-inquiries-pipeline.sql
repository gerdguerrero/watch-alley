-- Watch Alley structured inquiries pipeline (2026-04-28)
-- Replaces the mailto void. Public submits via public.submit_inquiry();
-- admin reads via public.admin_list_inquiries() and updates status via
-- public.admin_update_inquiry_status(). Status workflow:
--   new -> contacted -> viewing -> reserved -> sold/lost (terminal)
-- spam is a terminal escape hatch.
--
-- This is the substrate for the "one metric" — inquiry-to-sale conversion
-- rate, segmented by watch — that the strategic roadmap in
-- skills/software-development/watch-alley-development calls the hinge for
-- every product decision.

create table if not exists watch_alley.inquiries (
  id uuid primary key default gen_random_uuid(),
  watch_id text references watch_alley.watches(id) on delete set null,
  watch_slug text,
  buyer_name text not null check (length(trim(buyer_name)) between 1 and 120),
  buyer_email text not null check (buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(buyer_email) <= 254),
  buyer_phone text check (buyer_phone is null or length(buyer_phone) between 6 and 32),
  buyer_channel text check (buyer_channel is null or buyer_channel in ('viber','whatsapp','telegram','signal','sms','other')),
  message text not null check (length(trim(message)) between 1 and 4000),
  source text,
  user_agent text,
  ip_hash text,
  status text not null default 'new' check (status in ('new','contacted','viewing','reserved','sold','lost','spam')),
  status_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  closed_at timestamptz
);

comment on table watch_alley.inquiries is 'Buyer inquiries. Public can insert via submit_inquiry RPC. Admin reads/updates via admin_* RPCs.';

create index if not exists inquiries_status_created_idx on watch_alley.inquiries (status, created_at desc);
create index if not exists inquiries_watch_id_idx on watch_alley.inquiries (watch_id);
create index if not exists inquiries_created_idx on watch_alley.inquiries (created_at desc);

drop trigger if exists inquiries_set_updated_at on watch_alley.inquiries;
create trigger inquiries_set_updated_at
  before update on watch_alley.inquiries
  for each row execute function watch_alley.set_updated_at();

alter table watch_alley.inquiries enable row level security;
drop policy if exists "Deny all direct access" on watch_alley.inquiries;
create policy "Deny all direct access"
  on watch_alley.inquiries
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Public submission RPC (anon-callable). Hardened against abuse via length
-- and shape constraints baked into the table CHECKs.
create or replace function public.submit_inquiry(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.inquiries;
  resolved_watch_id text;
  resolved_watch_slug text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_watch_slug := nullif(payload->>'watchSlug','');
  resolved_watch_id := nullif(payload->>'watchId','');
  if resolved_watch_id is null and resolved_watch_slug is not null then
    select id into resolved_watch_id
    from watch_alley.watches
    where slug = resolved_watch_slug;
  end if;

  insert into watch_alley.inquiries (
    watch_id, watch_slug, buyer_name, buyer_email, buyer_phone, buyer_channel,
    message, source, user_agent, ip_hash
  )
  values (
    resolved_watch_id,
    resolved_watch_slug,
    coalesce(nullif(trim(payload->>'name'),''), 'Anonymous'),
    lower(trim(payload->>'email')),
    nullif(trim(payload->>'phone'),''),
    nullif(lower(trim(payload->>'channel')),''),
    coalesce(nullif(trim(payload->>'message'),''), ''),
    nullif(trim(payload->>'source'),''),
    nullif(left(coalesce(payload->>'userAgent',''), 512),''),
    nullif(payload->>'ipHash','')
  )
  returning * into result_row;

  return jsonb_build_object(
    'id', result_row.id,
    'status', result_row.status,
    'createdAt', result_row.created_at
  );
end;
$$;
revoke all on function public.submit_inquiry(jsonb) from public;
grant execute on function public.submit_inquiry(jsonb) to anon, authenticated;

create or replace function public.admin_list_inquiries(
  status_filter text default null,
  limit_count int default 100,
  offset_count int default 0
)
returns setof watch_alley.inquiries
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
    select *
    from watch_alley.inquiries
    where status_filter is null or status = status_filter
    order by created_at desc
    limit greatest(1, least(coalesce(limit_count, 100), 500))
    offset greatest(0, coalesce(offset_count, 0));
end;
$$;
revoke all on function public.admin_list_inquiries(text, int, int) from public;
grant execute on function public.admin_list_inquiries(text, int, int) to authenticated;

create or replace function public.admin_update_inquiry_status(
  inquiry_id uuid,
  new_status text,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.inquiries;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if new_status not in ('new','contacted','viewing','reserved','sold','lost','spam') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  update watch_alley.inquiries
  set status = new_status,
      status_note = coalesce(note, status_note),
      responded_at = case
        when new_status = 'contacted' and responded_at is null then now()
        else responded_at end,
      closed_at = case
        when new_status in ('sold','lost','spam') and closed_at is null then now()
        else closed_at end
  where id = inquiry_id
  returning * into result_row;

  if result_row.id is null then
    raise exception 'Inquiry not found' using errcode = 'P0002';
  end if;
  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_update_inquiry_status(uuid, text, text) from public;
grant execute on function public.admin_update_inquiry_status(uuid, text, text) to authenticated;

create or replace function public.admin_inquiry_metrics()
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

  with totals as (
    select
      count(*) filter (where created_at >= now() - interval '30 days') as last30,
      count(*) filter (where created_at >= now() - interval '7 days') as last7,
      count(*) as all_time,
      count(*) filter (where status = 'new') as new_count,
      count(*) filter (where status = 'contacted') as contacted_count,
      count(*) filter (where status = 'viewing') as viewing_count,
      count(*) filter (where status = 'reserved') as reserved_count,
      count(*) filter (where status = 'sold') as won_count,
      count(*) filter (where status = 'lost') as lost_count,
      count(*) filter (where status = 'spam') as spam_count
    from watch_alley.inquiries
  ),
  per_watch as (
    select
      coalesce(watch_id, 'unknown') as watch_id,
      count(*) as inquiries,
      count(*) filter (where status = 'sold') as won
    from watch_alley.inquiries
    where created_at >= now() - interval '90 days'
    group by 1
    order by inquiries desc
    limit 20
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(totals) from totals),
    'perWatchTop20', coalesce((select jsonb_agg(to_jsonb(per_watch)) from per_watch), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke all on function public.admin_inquiry_metrics() from public;
grant execute on function public.admin_inquiry_metrics() to authenticated;
