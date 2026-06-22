-- 4. Admin allowlist + authorization helper
create table if not exists watch_alley.admin_emails (
  email text primary key,
  added_at timestamptz not null default now(),
  note text
);
comment on table watch_alley.admin_emails is 'Allowlist of email addresses permitted to call public.admin_* RPCs.';

alter table watch_alley.admin_emails enable row level security;
-- No SELECT policy — only the service role can read this table.

create or replace function watch_alley.is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
begin
  caller_email := lower(coalesce(auth.email(), ''));
  if caller_email = '' then
    return false;
  end if;
  return exists (
    select 1 from watch_alley.admin_emails
    where lower(email) = caller_email
  );
end;
$$;
comment on function watch_alley.is_admin() is 'Returns true if the calling auth user''s email is on the watch_alley.admin_emails allowlist.';

revoke all on function watch_alley.is_admin() from public;
grant execute on function watch_alley.is_admin() to authenticated;

-- 5. Admin RPCs
create or replace function public.admin_whoami()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
begin
  caller_email := lower(coalesce(auth.email(), ''));
  return jsonb_build_object(
    'email', caller_email,
    'is_admin', watch_alley.is_admin()
  );
end;
$$;
revoke all on function public.admin_whoami() from public;
grant execute on function public.admin_whoami() to authenticated, anon;

create or replace function public.admin_upsert_watch(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_id text;
  result_row watch_alley.watches;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_id := nullif(payload->>'id', '');
  if resolved_id is null then
    select coalesce(
      'wa-' || lpad(((max(substr(id, 4)::int) + 1))::text, 3, '0'),
      'wa-001'
    )
    into resolved_id
    from watch_alley.watches
    where id ~ '^wa-[0-9]+$';

    if resolved_id is null then
      resolved_id := 'wa-001';
    end if;
  end if;

  insert into watch_alley.watches (
    id, slug, brand, model, reference, name, price, currency, status,
    condition_label, badge, movement, case_size, inclusion_set, material, edition,
    description, disclosure, primary_image, images, inquiry_subject, inquiry_body,
    sold_at, sold_price, has_box, has_papers, service_history, featured, low_stock,
    display_order
  )
  values (
    resolved_id,
    payload->>'slug',
    payload->>'brand',
    payload->>'model',
    payload->>'reference',
    payload->>'name',
    coalesce((payload->>'price')::int, 0),
    coalesce(payload->>'currency', 'PHP'),
    coalesce(payload->>'status', 'available'),
    payload->>'conditionLabel',
    payload->>'badge',
    payload->>'movement',
    payload->>'caseSize',
    payload->>'set',
    payload->>'material',
    payload->>'edition',
    payload->>'description',
    payload->>'disclosure',
    payload->>'primaryImage',
    case
      when jsonb_typeof(payload->'images') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(payload->'images') as value)
      else array[payload->>'primaryImage']
    end,
    payload->>'inquirySubject',
    payload->>'inquiryBody',
    nullif(payload->>'soldAt', ''),
    nullif(payload->>'soldPrice', '')::int,
    case when payload ? 'hasBox' then (payload->>'hasBox')::boolean end,
    case when payload ? 'hasPapers' then (payload->>'hasPapers')::boolean end,
    nullif(payload->>'serviceHistory', ''),
    coalesce((payload->>'featured')::boolean, false),
    coalesce((payload->>'lowStock')::boolean, false),
    coalesce((payload->>'displayOrder')::int, 0)
  )
  on conflict (id) do update set
    slug = excluded.slug,
    brand = excluded.brand,
    model = excluded.model,
    reference = excluded.reference,
    name = excluded.name,
    price = excluded.price,
    currency = excluded.currency,
    status = excluded.status,
    condition_label = excluded.condition_label,
    badge = excluded.badge,
    movement = excluded.movement,
    case_size = excluded.case_size,
    inclusion_set = excluded.inclusion_set,
    material = excluded.material,
    edition = excluded.edition,
    description = excluded.description,
    disclosure = excluded.disclosure,
    primary_image = excluded.primary_image,
    images = excluded.images,
    inquiry_subject = excluded.inquiry_subject,
    inquiry_body = excluded.inquiry_body,
    sold_at = excluded.sold_at,
    sold_price = excluded.sold_price,
    has_box = excluded.has_box,
    has_papers = excluded.has_papers,
    service_history = excluded.service_history,
    featured = excluded.featured,
    low_stock = excluded.low_stock,
    display_order = excluded.display_order
  returning * into result_row;

  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_upsert_watch(jsonb) from public;
grant execute on function public.admin_upsert_watch(jsonb) to authenticated;

create or replace function public.admin_delete_watch(watch_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if watch_id is null or length(trim(watch_id)) = 0 then
    raise exception 'watch_id is required' using errcode = '22023';
  end if;
  delete from watch_alley.watches where id = watch_id;
  return found;
end;
$$;
revoke all on function public.admin_delete_watch(text) from public;
grant execute on function public.admin_delete_watch(text) to authenticated;

create or replace function public.admin_mark_watch_sold(
  watch_id text,
  sold_at_value text,
  sold_price_value int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.watches;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if sold_at_value !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'sold_at must be YYYY-MM' using errcode = '22023';
  end if;
  if sold_price_value is null or sold_price_value < 0 then
    raise exception 'sold_price must be a non-negative integer' using errcode = '22023';
  end if;

  update watch_alley.watches
  set status = 'sold',
      sold_at = sold_at_value,
      sold_price = sold_price_value,
      badge = case when badge in ('SOLD','sold') then badge else 'SOLD' end
  where id = watch_id
  returning * into result_row;

  if result_row.id is null then
    raise exception 'Watch not found' using errcode = 'P0002';
  end if;
  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_mark_watch_sold(text, text, int) from public;
grant execute on function public.admin_mark_watch_sold(text, text, int) to authenticated;;
