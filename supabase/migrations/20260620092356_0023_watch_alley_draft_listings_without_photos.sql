
-- Allow photo-less inventory drafts
-- Draft = published=false. Published = must have photos.

alter table watch_alley.watches
  drop constraint if exists watches_images_check;

alter table watch_alley.watches
  drop constraint if exists watches_published_requires_photo;

alter table watch_alley.watches
  add constraint watches_published_requires_photo
  check (
    published = false
    or (
      length(trim(primary_image)) > 0
      and array_length(images, 1) >= 1
    )
  );

comment on constraint watches_published_requires_photo on watch_alley.watches is
  'Draft listings (published=false) may have no photos. Published listings must have a primary image and at least one image path.';

-- Recreate admin_upsert_watch RPC with empty image array support
create or replace function public.admin_upsert_watch(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_id text;
  result_row watch_alley.watches;
  cat text;
  badges_arr jsonb;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  cat := payload->>'category';
  if cat not in ('brand-new', 'pre-owned') then
    raise exception 'Invalid category: % (must be brand-new or pre-owned)', cat using errcode = '22023';
  end if;

  badges_arr := coalesce(payload->'badges', '[]'::jsonb);
  if jsonb_typeof(badges_arr) <> 'array' then
    badges_arr := '[]'::jsonb;
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
    id, slug, brand, model, reference, name, price, currency, status, category,
    condition_label, badge, badges, movement, case_size, inclusion_set, material,
    edition, description, disclosure, provenance, primary_image, images,
    inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
    service_history, featured, low_stock, display_order, published
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
    cat,
    payload->>'conditionLabel',
    payload->>'badge',
    badges_arr,
    payload->>'movement',
    payload->>'caseSize',
    payload->>'set',
    payload->>'material',
    payload->>'edition',
    payload->>'description',
    payload->>'disclosure',
    nullif(payload->>'provenance', ''),
    coalesce(nullif(payload->>'primaryImage', ''), ''),
    case
      when jsonb_typeof(payload->'images') = 'array'
        then coalesce(
          (
            select array_agg(trim(url))
            from jsonb_array_elements_text(payload->'images') as image_value(url)
            where length(trim(url)) > 0
          ),
          '{}'::text[]
        )
      when length(trim(coalesce(payload->>'primaryImage', ''))) > 0
        then array[payload->>'primaryImage']
      else '{}'::text[]
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
    coalesce((payload->>'displayOrder')::int, 0),
    coalesce((payload->>'published')::boolean, true)
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
    category = excluded.category,
    condition_label = excluded.condition_label,
    badge = excluded.badge,
    badges = excluded.badges,
    movement = excluded.movement,
    case_size = excluded.case_size,
    inclusion_set = excluded.inclusion_set,
    material = excluded.material,
    edition = excluded.edition,
    description = excluded.description,
    disclosure = excluded.disclosure,
    provenance = excluded.provenance,
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
    display_order = excluded.display_order,
    published = excluded.published
  returning * into result_row;

  return to_jsonb(result_row);
end;
$$;

revoke all on function public.admin_upsert_watch(jsonb) from public, anon;
grant execute on function public.admin_upsert_watch(jsonb) to authenticated;
;
