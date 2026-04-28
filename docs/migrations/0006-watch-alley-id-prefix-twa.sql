-- Watch Alley: rename watch IDs from wa-* to twa-* (2026-04-28).
-- "twa" matches the Supabase project name "the-watch-alley".
--
-- inquiries.watch_id is ON DELETE SET NULL with no ON UPDATE CASCADE,
-- so we update child rows explicitly. No other tables reference watches.id.

update watch_alley.watches
set id = 'twa-' || substr(id, 4)
where id ~ '^wa-[0-9]+$';

update watch_alley.inquiries
set watch_id = 'twa-' || substr(watch_id, 4)
where watch_id ~ '^wa-[0-9]+$';

-- Replace admin_upsert_watch with twa-prefixed auto-id generator.
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
      'twa-' || lpad(((max(substr(id, 5)::int) + 1))::text, 3, '0'),
      'twa-001'
    )
    into resolved_id
    from watch_alley.watches
    where id ~ '^twa-[0-9]+$';

    if resolved_id is null then
      resolved_id := 'twa-001';
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
revoke all on function public.admin_upsert_watch(jsonb) from public, anon;
grant execute on function public.admin_upsert_watch(jsonb) to authenticated;

comment on column watch_alley.watches.id is 'Stable string id (e.g. twa-001). "twa" = the-watch-alley.';
