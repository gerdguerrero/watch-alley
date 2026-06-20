-- Newsletter production hardening (2026-06-20)
--
-- Tightens service helper grants and adds private per-recipient delivery
-- events so broadcast sends can be idempotent without exposing subscriber
-- email addresses in newsletter send logs.

create table if not exists watch_alley.newsletter_delivery_events (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references watch_alley.newsletter_issues(id) on delete cascade,
  recipient_hash text not null check (length(recipient_hash) between 32 and 128),
  provider text not null default 'resend',
  provider_message_id text,
  status text not null check (status in ('sending','sent','failed','skipped')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_delivery_events_issue_created_idx
  on watch_alley.newsletter_delivery_events (issue_id, created_at desc);

create unique index if not exists newsletter_delivery_events_issue_recipient_sent_uidx
  on watch_alley.newsletter_delivery_events (issue_id, recipient_hash)
  where status = 'sent';

drop trigger if exists newsletter_delivery_events_set_updated_at
  on watch_alley.newsletter_delivery_events;
create trigger newsletter_delivery_events_set_updated_at
  before update on watch_alley.newsletter_delivery_events
  for each row execute function watch_alley.set_updated_at();

alter table watch_alley.newsletter_delivery_events enable row level security;

drop policy if exists "Deny all direct delivery event access"
  on watch_alley.newsletter_delivery_events;
create policy "Deny all direct delivery event access"
  on watch_alley.newsletter_delivery_events
  for all to anon, authenticated
  using (false)
  with check (false);

grant select, insert, update on watch_alley.newsletter_delivery_events to service_role;

revoke all on function public.service_list_active_subscribers() from public, anon, authenticated;
grant execute on function public.service_list_active_subscribers() to service_role;

revoke all on function public.service_update_newsletter_status(
  uuid, text, timestamptz, boolean, jsonb
) from public, anon, authenticated;
grant execute on function public.service_update_newsletter_status(
  uuid, text, timestamptz, boolean, jsonb
) to service_role;
