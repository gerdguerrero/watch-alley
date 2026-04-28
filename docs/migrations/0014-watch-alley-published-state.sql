-- Watch Alley draft / published state for inventory listings (2026-04-29).
--
-- Rationale: the operator wants to upload photos, write copy, and finalize a
-- listing in pieces — without exposing half-baked data on the storefront.
-- Default is `true` for backwards compatibility (existing 13 listings stay
-- visible). New rows can be flipped to draft, and from then on they only
-- render at /watch/<slug> when fetched with the service-role key (used by
-- the build pipeline to render a Draft banner + noindex on draft pages).
--
-- Idempotent. Safe to re-run.

-- ===========================================================================
-- 1. Schema
-- ===========================================================================

alter table watch_alley.watches
  add column if not exists published boolean not null default true;

comment on column watch_alley.watches.published is
  'Whether the listing is visible on the public storefront. true = live; false = draft (admin only). Default true for backwards compatibility with existing 13 listings.';

create index if not exists watches_published_display_order_idx
  on watch_alley.watches (published, status, display_order);

-- ===========================================================================
-- 2. RLS — anon callers see only published rows
-- ===========================================================================
-- The bootstrap policy "Public read access" had `using (true)`. Tighten it
-- to filter on published. Service role still bypasses RLS, so the build
-- pipeline can read drafts to render Draft pages with noindex.

drop policy if exists "Public read access" on watch_alley.watches;
create policy "Public read access"
  on watch_alley.watches
  for select
  to anon, authenticated
  using (published = true);

-- ===========================================================================
-- 3. public.watches view — recreate so PostgREST exposes the column
-- ===========================================================================

drop view if exists public.watches;
create view public.watches
with (security_invoker = true)
as
select
  id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, provenance, primary_image, images,
  inquiry_subject, inquiry_body,
  sold_at, sold_price, has_box, has_papers, service_history,
  featured, low_stock, display_order, published,
  created_at, updated_at
from watch_alley.watches;

comment on view public.watches is
  'Read-only view of watch_alley.watches exposed to PostgREST. Anon callers see only published=true rows due to RLS. Service role sees everything.';

grant select on public.watches to anon, authenticated;
-- service_role needs explicit SELECT on the underlying table so the build
-- pipeline (scripts/generate-watch-pages.mjs) can fetch drafts. RLS does
-- not gate service_role, but PostgREST still enforces table-level grants.
grant select on watch_alley.watches to service_role;

-- ===========================================================================
-- 4. admin_upsert_watch — accept and persist `published`
-- ===========================================================================
-- Drop-then-create was already required when we added `provenance`. We add
-- the same handling for `published` here. Default to true if the payload
-- omits the key (matches the column default).

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
    description, disclosure, provenance, primary_image, images,
    inquiry_subject, inquiry_body,
    sold_at, sold_price, has_box, has_papers, service_history, featured, low_stock,
    display_order, published
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
    nullif(payload->>'provenance', ''),
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
    condition_label = excluded.condition_label,
    badge = excluded.badge,
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

-- ===========================================================================
-- 5. admin_list_watches — admin-only read that bypasses the published filter
-- ===========================================================================
-- The new public.watches RLS hides drafts from authenticated callers (only
-- service role bypasses RLS). The admin UI needs to see drafts to edit them,
-- so we expose a SECURITY DEFINER RPC gated on is_admin().

create or replace function public.admin_list_watches()
returns setof watch_alley.watches
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
    select * from watch_alley.watches
    order by status asc, display_order asc;
end;
$$;
revoke all on function public.admin_list_watches() from public, anon;
grant execute on function public.admin_list_watches() to authenticated;
comment on function public.admin_list_watches() is
  'Returns every watch_alley.watches row (drafts + published). Admin-only.';
