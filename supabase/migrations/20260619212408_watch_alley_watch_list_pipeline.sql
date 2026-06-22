-- The Watch List collector pipeline (2026-06-20)
--
-- Public visitors submit through Next.js route handlers. Those handlers call
-- these service-role-only RPCs so lead data stays out of the browser and out
-- of direct anon/authenticated table access.

create table if not exists watch_alley.watch_list_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(email) <= 254
    and email = lower(email)
  ),
  first_name text check (first_name is null or length(trim(first_name)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced', 'spam')),
  consent_text text not null check (length(trim(consent_text)) between 20 and 1000),
  consent_version text not null default 'watch-list-consent-v1',
  consent_captured_at timestamptz not null default now(),
  consent_ip_hash text,
  consent_user_agent text,
  first_source text,
  last_source text,
  source_path text,
  utm jsonb not null default '{}'::jsonb check (jsonb_typeof(utm) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_subscribed_at timestamptz not null default now()
);
create unique index if not exists watch_list_subscribers_email_uidx
  on watch_alley.watch_list_subscribers (email);
create index if not exists watch_list_subscribers_created_idx
  on watch_alley.watch_list_subscribers (created_at desc);
drop trigger if exists watch_list_subscribers_set_updated_at on watch_alley.watch_list_subscribers;
create trigger watch_list_subscribers_set_updated_at
  before update on watch_alley.watch_list_subscribers
  for each row execute function watch_alley.set_updated_at();
create table if not exists watch_alley.watch_list_preferences (
  subscriber_id uuid primary key references watch_alley.watch_list_subscribers(id) on delete cascade,
  brands text[] not null default '{}',
  categories text[] not null default '{}',
  budget_min_php integer check (budget_min_php is null or budget_min_php >= 0),
  budget_max_php integer check (budget_max_php is null or budget_max_php >= 0),
  wrist_size text check (wrist_size is null or length(trim(wrist_size)) <= 80),
  purchase_intent text check (
    purchase_intent is null
    or purchase_intent in ('just-browsing', 'ready-now', 'next-30-days', 'next-90-days', 'specific-reference')
  ),
  notes text check (notes is null or length(trim(notes)) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min_php is null or budget_max_php is null or budget_min_php <= budget_max_php)
);
drop trigger if exists watch_list_preferences_set_updated_at on watch_alley.watch_list_preferences;
create trigger watch_list_preferences_set_updated_at
  before update on watch_alley.watch_list_preferences
  for each row execute function watch_alley.set_updated_at();
create table if not exists watch_alley.watch_list_alerts (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references watch_alley.watch_list_subscribers(id) on delete cascade,
  watch_id text references watch_alley.watches(id) on delete set null,
  watch_slug text,
  watch_title text not null check (length(trim(watch_title)) between 1 and 260),
  brand text,
  reference text,
  alert_type text not null default 'similar-watch' check (alert_type in ('similar-watch', 'price-drop', 'availability')),
  status text not null default 'active' check (status in ('active', 'fulfilled', 'cancelled', 'spam')),
  notes text check (notes is null or length(trim(notes)) <= 2000),
  source text,
  source_path text,
  consent_text text not null check (length(trim(consent_text)) between 20 and 1000),
  consent_version text not null default 'watch-list-consent-v1',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists watch_list_alerts_subscriber_created_idx
  on watch_alley.watch_list_alerts (subscriber_id, created_at desc);
create index if not exists watch_list_alerts_watch_slug_idx
  on watch_alley.watch_list_alerts (watch_slug);
drop trigger if exists watch_list_alerts_set_updated_at on watch_alley.watch_list_alerts;
create trigger watch_list_alerts_set_updated_at
  before update on watch_alley.watch_list_alerts
  for each row execute function watch_alley.set_updated_at();
create table if not exists watch_alley.sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references watch_alley.watch_list_subscribers(id) on delete set null,
  buyer_name text not null check (length(trim(buyer_name)) between 1 and 120),
  buyer_email text not null check (
    buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(buyer_email) <= 254
    and buyer_email = lower(buyer_email)
  ),
  buyer_phone text check (buyer_phone is null or length(trim(buyer_phone)) between 6 and 32),
  preferred_contact text not null default 'email' check (preferred_contact in ('email', 'messenger', 'viber', 'whatsapp', 'sms')),
  brands text[] not null default '{}',
  reference text check (reference is null or length(trim(reference)) <= 240),
  budget_min_php integer check (budget_min_php is null or budget_min_php >= 0),
  budget_max_php integer check (budget_max_php is null or budget_max_php >= 0),
  timeline text check (timeline is null or timeline in ('now', '30-days', '90-days', 'patient')),
  condition_preference text check (
    condition_preference is null
    or condition_preference in ('brand-new', 'pre-owned', 'either')
  ),
  wrist_size text check (wrist_size is null or length(trim(wrist_size)) <= 80),
  notes text not null check (length(trim(notes)) between 10 and 4000),
  source text,
  source_path text,
  consent_text text not null check (length(trim(consent_text)) between 20 and 1000),
  consent_version text not null default 'watch-list-consent-v1',
  status text not null default 'new' check (status in ('new', 'contacted', 'sourcing', 'offered', 'closed', 'spam')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min_php is null or budget_max_php is null or budget_min_php <= budget_max_php)
);
create index if not exists sourcing_requests_status_created_idx
  on watch_alley.sourcing_requests (status, created_at desc);
create index if not exists sourcing_requests_email_created_idx
  on watch_alley.sourcing_requests (buyer_email, created_at desc);
drop trigger if exists sourcing_requests_set_updated_at on watch_alley.sourcing_requests;
create trigger sourcing_requests_set_updated_at
  before update on watch_alley.sourcing_requests
  for each row execute function watch_alley.set_updated_at();
comment on table watch_alley.watch_list_subscribers is
  'The Watch List subscribers with consent/source metadata. Writes go through service-role-only RPCs.';
comment on table watch_alley.watch_list_preferences is
  'Collector preferences used for newsletter segmentation and sourcing demand.';
comment on table watch_alley.watch_list_alerts is
  'Per-watch alerts, especially sold-watch similar-piece requests.';
comment on table watch_alley.sourcing_requests is
  'Structured Private Collecting Desk sourcing requests.';
alter table watch_alley.watch_list_subscribers enable row level security;
alter table watch_alley.watch_list_preferences enable row level security;
alter table watch_alley.watch_list_alerts enable row level security;
alter table watch_alley.sourcing_requests enable row level security;
drop policy if exists "Deny all direct access" on watch_alley.watch_list_subscribers;
create policy "Deny all direct access"
  on watch_alley.watch_list_subscribers
  for all to anon, authenticated
  using (false)
  with check (false);
drop policy if exists "Deny all direct access" on watch_alley.watch_list_preferences;
create policy "Deny all direct access"
  on watch_alley.watch_list_preferences
  for all to anon, authenticated
  using (false)
  with check (false);
drop policy if exists "Deny all direct access" on watch_alley.watch_list_alerts;
create policy "Deny all direct access"
  on watch_alley.watch_list_alerts
  for all to anon, authenticated
  using (false)
  with check (false);
drop policy if exists "Deny all direct access" on watch_alley.sourcing_requests;
create policy "Deny all direct access"
  on watch_alley.sourcing_requests
  for all to anon, authenticated
  using (false)
  with check (false);
grant usage on schema watch_alley to service_role;
grant select, insert, update on
  watch_alley.watch_list_subscribers,
  watch_alley.watch_list_preferences,
  watch_alley.watch_list_alerts,
  watch_alley.sourcing_requests
to service_role;
create or replace function watch_alley.jsonb_text_array(input jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    array_agg(trim(value) order by trim(value)),
    '{}'::text[]
  )
  from jsonb_array_elements_text(coalesce(input, '[]'::jsonb)) as value
  where length(trim(value)) between 1 and 80;
$$;
create or replace function watch_alley.jsonb_positive_int(payload jsonb, key_name text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw_value text;
begin
  raw_value := nullif(trim(payload->>key_name), '');
  if raw_value is null then
    return null;
  end if;
  if raw_value !~ '^[0-9]+$' then
    return null;
  end if;
  return raw_value::integer;
end;
$$;
create or replace function watch_alley.upsert_watch_list_subscriber(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  existing_id uuid;
  result_id uuid;
  duplicate boolean := false;
  first_name_value text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  normalized_email := lower(trim(coalesce(payload->>'email', '')));
  if normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(normalized_email) > 254 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  if coalesce(payload->>'consentAccepted', '') <> 'true' then
    raise exception 'Consent is required' using errcode = '22023';
  end if;

  first_name_value := nullif(trim(coalesce(payload->>'firstName', '')), '');

  select id into existing_id
  from watch_alley.watch_list_subscribers
  where email = normalized_email;

  if existing_id is null then
    insert into watch_alley.watch_list_subscribers (
      email, first_name, consent_text, consent_version, consent_ip_hash,
      consent_user_agent, first_source, last_source, source_path, utm
    )
    values (
      normalized_email,
      first_name_value,
      trim(payload->>'consentText'),
      coalesce(nullif(trim(payload->>'consentVersion'), ''), 'watch-list-consent-v1'),
      nullif(trim(payload->>'ipHash'), ''),
      nullif(left(coalesce(payload->>'userAgent', ''), 512), ''),
      nullif(trim(payload->>'source'), ''),
      nullif(trim(payload->>'source'), ''),
      nullif(trim(payload->>'sourcePath'), ''),
      case when jsonb_typeof(payload->'utm') = 'object' then payload->'utm' else '{}'::jsonb end
    )
    returning id into result_id;
  else
    duplicate := true;
    update watch_alley.watch_list_subscribers
    set first_name = coalesce(first_name_value, first_name),
        status = 'active',
        consent_text = trim(payload->>'consentText'),
        consent_version = coalesce(nullif(trim(payload->>'consentVersion'), ''), consent_version),
        consent_captured_at = now(),
        consent_ip_hash = nullif(trim(payload->>'ipHash'), ''),
        consent_user_agent = nullif(left(coalesce(payload->>'userAgent', ''), 512), ''),
        last_source = nullif(trim(payload->>'source'), ''),
        source_path = coalesce(nullif(trim(payload->>'sourcePath'), ''), source_path),
        utm = case when jsonb_typeof(payload->'utm') = 'object' then payload->'utm' else utm end,
        last_subscribed_at = now()
    where id = existing_id
    returning id into result_id;
  end if;

  if payload ? 'preferences' and jsonb_typeof(payload->'preferences') = 'object' then
    insert into watch_alley.watch_list_preferences (
      subscriber_id, brands, categories, budget_min_php, budget_max_php,
      wrist_size, purchase_intent, notes
    )
    values (
      result_id,
      watch_alley.jsonb_text_array(payload->'preferences'->'brands'),
      watch_alley.jsonb_text_array(payload->'preferences'->'categories'),
      watch_alley.jsonb_positive_int(payload->'preferences', 'budgetMinPhp'),
      watch_alley.jsonb_positive_int(payload->'preferences', 'budgetMaxPhp'),
      nullif(trim(payload->'preferences'->>'wristSize'), ''),
      nullif(trim(payload->'preferences'->>'purchaseIntent'), ''),
      nullif(trim(payload->'preferences'->>'notes'), '')
    )
    on conflict (subscriber_id) do update
    set brands = excluded.brands,
        categories = excluded.categories,
        budget_min_php = excluded.budget_min_php,
        budget_max_php = excluded.budget_max_php,
        wrist_size = excluded.wrist_size,
        purchase_intent = excluded.purchase_intent,
        notes = excluded.notes;
  end if;

  return jsonb_build_object('subscriberId', result_id, 'duplicate', duplicate);
end;
$$;
create or replace function public.submit_watch_list_signup(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return watch_alley.upsert_watch_list_subscriber(payload);
end;
$$;
create or replace function public.submit_watch_list_alert(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscriber_result jsonb;
  subscriber_id uuid;
  result_id uuid;
  resolved_watch_id text;
begin
  subscriber_result := watch_alley.upsert_watch_list_subscriber(payload);
  subscriber_id := (subscriber_result->>'subscriberId')::uuid;

  resolved_watch_id := nullif(trim(coalesce(payload->>'watchId', '')), '');
  if resolved_watch_id is null and nullif(trim(coalesce(payload->>'watchSlug', '')), '') is not null then
    select id into resolved_watch_id
    from watch_alley.watches
    where slug = trim(payload->>'watchSlug');
  end if;

  insert into watch_alley.watch_list_alerts (
    subscriber_id, watch_id, watch_slug, watch_title, brand, reference,
    alert_type, notes, source, source_path, consent_text, consent_version, metadata
  )
  values (
    subscriber_id,
    resolved_watch_id,
    nullif(trim(payload->>'watchSlug'), ''),
    trim(payload->>'watchTitle'),
    nullif(trim(payload->>'brand'), ''),
    nullif(trim(payload->>'reference'), ''),
    coalesce(nullif(trim(payload->>'alertType'), ''), 'similar-watch'),
    nullif(trim(payload->>'notes'), ''),
    nullif(trim(payload->>'source'), ''),
    nullif(trim(payload->>'sourcePath'), ''),
    trim(payload->>'consentText'),
    coalesce(nullif(trim(payload->>'consentVersion'), ''), 'watch-list-consent-v1'),
    case when jsonb_typeof(payload->'metadata') = 'object' then payload->'metadata' else '{}'::jsonb end
  )
  returning id into result_id;

  return jsonb_build_object(
    'alertId', result_id,
    'subscriberId', subscriber_id,
    'duplicateSubscriber', (subscriber_result->>'duplicate')::boolean
  );
end;
$$;
create or replace function public.submit_sourcing_request(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscriber_result jsonb;
  subscriber_id uuid;
  result_id uuid;
  normalized_email text;
begin
  subscriber_result := watch_alley.upsert_watch_list_subscriber(payload);
  subscriber_id := (subscriber_result->>'subscriberId')::uuid;
  normalized_email := lower(trim(payload->>'email'));

  insert into watch_alley.sourcing_requests (
    subscriber_id, buyer_name, buyer_email, buyer_phone, preferred_contact,
    brands, reference, budget_min_php, budget_max_php, timeline,
    condition_preference, wrist_size, notes, source, source_path,
    consent_text, consent_version, metadata
  )
  values (
    subscriber_id,
    trim(payload->>'name'),
    normalized_email,
    nullif(trim(payload->>'phone'), ''),
    coalesce(nullif(trim(payload->>'preferredContact'), ''), 'email'),
    watch_alley.jsonb_text_array(payload->'brands'),
    nullif(trim(payload->>'reference'), ''),
    watch_alley.jsonb_positive_int(payload, 'budgetMinPhp'),
    watch_alley.jsonb_positive_int(payload, 'budgetMaxPhp'),
    nullif(trim(payload->>'timeline'), ''),
    nullif(trim(payload->>'conditionPreference'), ''),
    nullif(trim(payload->>'wristSize'), ''),
    trim(payload->>'notes'),
    nullif(trim(payload->>'source'), ''),
    nullif(trim(payload->>'sourcePath'), ''),
    trim(payload->>'consentText'),
    coalesce(nullif(trim(payload->>'consentVersion'), ''), 'watch-list-consent-v1'),
    case when jsonb_typeof(payload->'metadata') = 'object' then payload->'metadata' else '{}'::jsonb end
  )
  returning id into result_id;

  return jsonb_build_object(
    'requestId', result_id,
    'subscriberId', subscriber_id,
    'duplicateSubscriber', (subscriber_result->>'duplicate')::boolean
  );
end;
$$;
revoke all on function watch_alley.jsonb_text_array(jsonb) from public, anon, authenticated;
revoke all on function watch_alley.jsonb_positive_int(jsonb, text) from public, anon, authenticated;
revoke all on function watch_alley.upsert_watch_list_subscriber(jsonb) from public, anon, authenticated;
revoke all on function public.submit_watch_list_signup(jsonb) from public, anon, authenticated;
revoke all on function public.submit_watch_list_alert(jsonb) from public, anon, authenticated;
revoke all on function public.submit_sourcing_request(jsonb) from public, anon, authenticated;
grant execute on function public.submit_watch_list_signup(jsonb) to service_role;
grant execute on function public.submit_watch_list_alert(jsonb) to service_role;
grant execute on function public.submit_sourcing_request(jsonb) to service_role;
