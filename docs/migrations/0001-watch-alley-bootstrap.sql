-- Watch Alley Supabase bootstrap
-- Run this once against a fresh Watch Alley Supabase project (in your own org).
-- Re-runnable: every step is idempotent.
--
-- After running:
--   1. Copy your project URL + publishable anon key into .env.local
--      (WATCH_ALLEY_SUPABASE_URL, WATCH_ALLEY_SUPABASE_ANON_KEY).
--   2. Update the SUPABASE_URL and SUPABASE_ANON_KEY constants near the top of
--      scripts/admin.js with the same values.
--   3. Insert your admin email into watch_alley.admin_emails.
--   4. Seed inventory by running pnpm sync:watches with --service-role once,
--      OR run docs/migrations/0002-watch-alley-seed.sql in the SQL editor.

-- ===========================================================================
-- 1. Schema and inventory table
-- ===========================================================================

create schema if not exists watch_alley;
comment on schema watch_alley is 'Watch Alley PH inventory and operations.';

create table if not exists watch_alley.watches (
  id text primary key,
  slug text not null unique,
  brand text not null,
  model text not null,
  reference text not null,
  name text not null,
  price integer not null check (price >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null check (status in ('available', 'reserved', 'sold')),
  condition_label text not null,
  badge text not null,
  movement text not null,
  case_size text not null,
  inclusion_set text not null,
  material text not null,
  edition text not null,
  description text not null,
  disclosure text not null,
  primary_image text not null,
  images text[] not null check (array_length(images, 1) >= 1),
  inquiry_subject text not null,
  inquiry_body text not null,
  sold_at text check (sold_at is null or sold_at ~ '^[0-9]{4}-[0-9]{2}$'),
  sold_price integer check (sold_price is null or sold_price >= 0),
  has_box boolean,
  has_papers boolean,
  service_history text,
  featured boolean not null default false,
  low_stock boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sold_status_requires_sold_at_and_price
    check (
      status <> 'sold'
      or (sold_at is not null and sold_price is not null)
    )
);

comment on table watch_alley.watches is 'Watch Alley inventory. Synced to public/data/watches.json by scripts/sync-watches-from-supabase.mjs.';
comment on column watch_alley.watches.id is 'Stable string id (e.g. wa-001). Kept for backwards compatibility with the JSON source of truth.';
comment on column watch_alley.watches.inclusion_set is 'Set/inclusions copy (camelCase "set" in JSON; renamed because "set" is a SQL reserved word).';
comment on column watch_alley.watches.display_order is 'Lower numbers render first in the homepage carousel; sold listings still ordered by sold_at desc.';

create index if not exists watches_status_display_order_idx
  on watch_alley.watches (status, display_order);
create index if not exists watches_sold_at_idx
  on watch_alley.watches (sold_at desc nulls last);

-- ===========================================================================
-- 2. updated_at trigger (search_path pinned per Supabase advisor)
-- ===========================================================================

create or replace function watch_alley.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watches_set_updated_at on watch_alley.watches;
create trigger watches_set_updated_at
  before update on watch_alley.watches
  for each row execute function watch_alley.set_updated_at();

-- ===========================================================================
-- 3. RLS + read-only public access via a public-schema view
-- ===========================================================================

alter table watch_alley.watches enable row level security;

drop policy if exists "Public read access" on watch_alley.watches;
create policy "Public read access"
  on watch_alley.watches
  for select
  to anon, authenticated
  using (true);

grant usage on schema watch_alley to anon, authenticated;
grant select on watch_alley.watches to anon, authenticated;

create or replace view public.watches
with (security_invoker = true)
as
select
  id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, primary_image, images, inquiry_subject, inquiry_body,
  sold_at, sold_price, has_box, has_papers, service_history,
  featured, low_stock, display_order, created_at, updated_at
from watch_alley.watches;

comment on view public.watches is 'Read-only view of watch_alley.watches exposed to PostgREST. Writes go through admin RPCs.';
grant select on public.watches to anon, authenticated;

-- ===========================================================================
-- 4. Admin allowlist + authorization helper
-- ===========================================================================

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

-- ===========================================================================
-- 5. Admin RPCs (SECURITY DEFINER, gated by is_admin())
-- ===========================================================================

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
grant execute on function public.admin_mark_watch_sold(text, text, int) to authenticated;
