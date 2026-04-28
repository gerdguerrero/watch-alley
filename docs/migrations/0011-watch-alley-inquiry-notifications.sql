-- Watch Alley inquiry-notification audit log (2026-04-28)
--
-- The Edge Function `inquiry-notify` records every fan-out attempt (email,
-- viber, slack) here so the owner can audit reply-time SLAs, debug missed
-- notifications, and prove deliverability without reading function logs.
--
-- The function is invoked by a Supabase Database Webhook configured in the
-- dashboard (Database → Webhooks → New) on INSERT into
-- `watch_alley.inquiries`. The webhook carries header
-- `x-watch-alley-secret: <INQUIRY_NOTIFY_SECRET>` for authentication. This
-- migration does NOT create the webhook itself; webhooks live outside SQL.
--
-- Idempotent. Safe to re-run.

create table if not exists watch_alley.notification_log (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references watch_alley.inquiries(id) on delete cascade,
  channel text not null check (channel in ('email','viber','slack')),
  status text not null check (status in ('success','failed','skipped')),
  detail text,
  attempted_at timestamptz not null default now()
);

comment on table watch_alley.notification_log is
  'Audit log for inquiry-notify Edge Function fan-outs. One row per (inquiry, channel, attempt). Read via admin RPC; no public access.';

create index if not exists notification_log_inquiry_idx
  on watch_alley.notification_log (inquiry_id, attempted_at desc);
create index if not exists notification_log_status_idx
  on watch_alley.notification_log (status, attempted_at desc);

alter table watch_alley.notification_log enable row level security;

drop policy if exists "Deny all direct access" on watch_alley.notification_log;
create policy "Deny all direct access"
  on watch_alley.notification_log
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Service role bypasses RLS automatically; the Edge Function inserts using
-- SUPABASE_SERVICE_ROLE_KEY. No grants needed for anon/authenticated.

-- Admin read RPC so the future Inbox tab can show "Email sent · 14:32" etc.
create or replace function public.admin_list_notification_log(
  inquiry_id_filter uuid default null,
  limit_count int default 100
)
returns setof watch_alley.notification_log
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
    from watch_alley.notification_log
    where inquiry_id_filter is null or inquiry_id = inquiry_id_filter
    order by attempted_at desc
    limit greatest(1, least(limit_count, 500));
end;
$$;
revoke all on function public.admin_list_notification_log(uuid, int) from public, anon;
grant execute on function public.admin_list_notification_log(uuid, int) to authenticated;
