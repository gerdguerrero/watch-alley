-- Watch Alley Supabase bootstrap (idempotent)

-- 1. Schema and inventory table
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
    check (status <> 'sold' or (sold_at is not null and sold_price is not null))
);

comment on table watch_alley.watches is 'Watch Alley inventory. Synced to public/data/watches.json by scripts/sync-watches-from-supabase.mjs.';
comment on column watch_alley.watches.id is 'Stable string id (e.g. wa-001). Kept for backwards compatibility with the JSON source of truth.';
comment on column watch_alley.watches.inclusion_set is 'Set/inclusions copy (camelCase "set" in JSON; renamed because "set" is a SQL reserved word).';
comment on column watch_alley.watches.display_order is 'Lower numbers render first in the homepage carousel; sold listings still ordered by sold_at desc.';

create index if not exists watches_status_display_order_idx on watch_alley.watches (status, display_order);
create index if not exists watches_sold_at_idx on watch_alley.watches (sold_at desc nulls last);

-- 2. updated_at trigger
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

-- 3. RLS + read-only public access via a public-schema view
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
grant select on public.watches to anon, authenticated;;
