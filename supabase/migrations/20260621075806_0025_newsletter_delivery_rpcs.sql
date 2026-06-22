
-- RPC: Check if a delivery was already sent for a given issue+recipient
create or replace function public.service_check_delivery_sent(
  p_issue_id uuid,
  p_recipient_hash text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from watch_alley.newsletter_delivery_events
    where issue_id = p_issue_id
      and recipient_hash = p_recipient_hash
      and status = 'sent'
  );
$$;

revoke all on function public.service_check_delivery_sent(uuid, text) from public, anon;
grant execute on function public.service_check_delivery_sent(uuid, text) to service_role, authenticated;

-- RPC: Log a delivery event
create or replace function public.service_log_delivery_event(
  p_issue_id uuid,
  p_recipient_hash text,
  p_provider text default 'resend',
  p_provider_message_id text default null,
  p_status text default 'sending',
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into watch_alley.newsletter_delivery_events (
    issue_id,
    recipient_hash,
    provider,
    provider_message_id,
    status,
    error_message,
    metadata
  ) values (
    p_issue_id,
    p_recipient_hash,
    p_provider,
    p_provider_message_id,
    p_status,
    p_error_message,
    p_metadata
  );
end;
$$;

revoke all on function public.service_log_delivery_event(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.service_log_delivery_event(uuid, text, text, text, text, text, jsonb) to service_role, authenticated;
;
