-- Watch Alley: Manual inquiry logging from the admin Inbox (2026-05-25)
--
-- The public site hands buyer conversations off to Facebook Messenger via the
-- "Message the Seller" CTAs (m.me/thewatchalley). Those threads never reach
-- watch_alley.inquiries because Messenger is a closed channel — no webhook
-- back into our system. As a result the Inbox stays at zero even though real
-- conversations are happening.
--
-- This migration adds the ability for the admin to manually log a Messenger
-- (or walk-in, phone, etc.) inquiry into the same pipeline so the Inbox
-- becomes a working CRM rather than a dead surface. Three changes:
--
--   1. buyer_email becomes nullable. Messenger leads frequently share a name
--      and intent without an email upfront, and forcing a fake address would
--      pollute the data more than allowing null.
--   2. 'messenger' joins the buyer_channel enum alongside viber/whatsapp/etc.
--   3. New admin-only RPC admin_log_inquiry() inserts a row tagged with
--      source='admin-manual'. The inquiry-notify edge function uses that tag
--      to skip the email/Slack fan-out (we already received the message — no
--      need to email ourselves about it).

-- 1. Relax buyer_email constraints.
alter table watch_alley.inquiries
  alter column buyer_email drop not null;

alter table watch_alley.inquiries
  drop constraint if exists inquiries_buyer_email_check;

alter table watch_alley.inquiries
  add constraint inquiries_buyer_email_check
  check (
    buyer_email is null
    or (
      buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      and length(buyer_email) <= 254
    )
  );

-- 2. Extend buyer_channel enum to include 'messenger'.
alter table watch_alley.inquiries
  drop constraint if exists inquiries_buyer_channel_check;

alter table watch_alley.inquiries
  add constraint inquiries_buyer_channel_check
  check (
    buyer_channel is null
    or buyer_channel in ('messenger','viber','whatsapp','telegram','signal','sms','other')
  );

-- 3. Admin-only manual log RPC.
create or replace function public.admin_log_inquiry(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.inquiries;
  resolved_watch_id text;
  resolved_watch_slug text;
  resolved_channel text;
  resolved_email text;
  resolved_phone text;
  resolved_message text;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_watch_slug := nullif(trim(payload->>'watchSlug'),'');
  resolved_watch_id := nullif(trim(payload->>'watchId'),'');
  if resolved_watch_id is null and resolved_watch_slug is not null then
    select id into resolved_watch_id
    from watch_alley.watches
    where slug = resolved_watch_slug;
  end if;

  resolved_channel := nullif(lower(trim(payload->>'channel')),'');
  if resolved_channel is null then
    resolved_channel := 'messenger';
  end if;

  resolved_email := nullif(lower(trim(payload->>'email')),'');
  resolved_phone := nullif(trim(payload->>'phone'),'');
  resolved_message := coalesce(nullif(trim(payload->>'message'),''), 'Logged from ' || resolved_channel);

  insert into watch_alley.inquiries (
    watch_id, watch_slug, buyer_name, buyer_email, buyer_phone, buyer_channel,
    message, source, status_note
  )
  values (
    resolved_watch_id,
    resolved_watch_slug,
    coalesce(nullif(trim(payload->>'name'),''), 'Anonymous'),
    resolved_email,
    resolved_phone,
    resolved_channel,
    resolved_message,
    'admin-manual',
    nullif(trim(payload->>'note'),'')
  )
  returning * into result_row;

  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_log_inquiry(jsonb) from public, anon;
grant execute on function public.admin_log_inquiry(jsonb) to authenticated;

comment on function public.admin_log_inquiry(jsonb) is
  'Admin-only insert into watch_alley.inquiries for conversations that arrived off-platform (Messenger, walk-in, phone). Tags source=admin-manual so inquiry-notify skips the fan-out.';
