-- Migration: Add country to subscribers and update upsert function (2026-06-21)

alter table watch_alley.watch_list_subscribers
  add column if not exists country text check (country is null or (length(trim(country)) between 1 and 100));

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
  country_value text;
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
  country_value := nullif(trim(coalesce(payload->>'country', '')), '');

  select id into existing_id
  from watch_alley.watch_list_subscribers
  where email = normalized_email;

  if existing_id is null then
    insert into watch_alley.watch_list_subscribers (
      email, first_name, country, consent_text, consent_version, consent_ip_hash,
      consent_user_agent, first_source, last_source, source_path, utm
    )
    values (
      normalized_email,
      first_name_value,
      country_value,
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
        country = coalesce(country_value, country),
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
