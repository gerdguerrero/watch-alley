-- Watch Alley journal CMS (2026-04-29).
--
-- The client (admin) writes journal articles directly in /admin instead of
-- editing static HTML files. Articles are markdown, drafts are private,
-- published articles render to dist/journal/<slug>/index.html at build.
--
-- Idempotent. Safe to re-run.

-- ===========================================================================
-- 1. journal_posts table
-- ===========================================================================

create table if not exists watch_alley.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 120),
  title text not null check (length(trim(title)) between 1 and 240),
  summary text not null check (length(trim(summary)) between 1 and 320),
  body_markdown text not null check (length(body_markdown) <= 200000),
  hero_image text,
  tags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft','scheduled','published')),
  publish_at timestamptz,
  author text,
  read_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,

  constraint journal_published_requires_publish_at
    check (status <> 'published' or published_at is not null),
  constraint journal_scheduled_requires_publish_at
    check (status <> 'scheduled' or publish_at is not null)
);

comment on table watch_alley.journal_posts is
  'Editorial journal articles authored by admins via /admin. status=draft is private; published articles render to dist/journal/<slug>/index.html at build time.';

create index if not exists journal_posts_status_idx
  on watch_alley.journal_posts (status, coalesce(published_at, publish_at, created_at) desc);
create index if not exists journal_posts_publish_at_idx
  on watch_alley.journal_posts (publish_at) where status = 'scheduled';

-- updated_at trigger reuses the existing function.
drop trigger if exists journal_posts_set_updated_at on watch_alley.journal_posts;
create trigger journal_posts_set_updated_at
  before update on watch_alley.journal_posts
  for each row execute function watch_alley.set_updated_at();

-- ===========================================================================
-- 2. RLS posture
-- ===========================================================================

alter table watch_alley.journal_posts enable row level security;

-- Public can read PUBLISHED posts only. Drafts and scheduled posts are
-- invisible to anon. Admins read everything via the admin RPCs below
-- (which use SECURITY DEFINER, so no separate admin SELECT policy needed).
drop policy if exists "Public read published" on watch_alley.journal_posts;
create policy "Public read published"
  on watch_alley.journal_posts
  for select
  to anon, authenticated
  using (status = 'published');

-- Direct writes are denied; admins go through admin_upsert_journal_post.
drop policy if exists "Deny direct writes" on watch_alley.journal_posts;
create policy "Deny direct writes"
  on watch_alley.journal_posts
  for insert
  to anon, authenticated
  with check (false);
drop policy if exists "Deny direct updates" on watch_alley.journal_posts;
create policy "Deny direct updates"
  on watch_alley.journal_posts
  for update
  to anon, authenticated
  using (false)
  with check (false);
drop policy if exists "Deny direct deletes" on watch_alley.journal_posts;
create policy "Deny direct deletes"
  on watch_alley.journal_posts
  for delete
  to anon, authenticated
  using (false);

-- ===========================================================================
-- 3. public.journal_posts read view (PostgREST surface)
-- ===========================================================================
-- Storefront fetches via /rest/v1/journal_posts?status=eq.published.

drop view if exists public.journal_posts;
create view public.journal_posts
with (security_invoker = true)
as
select
  id, slug, title, summary, body_markdown, hero_image, tags,
  status, publish_at, author, read_minutes,
  created_at, updated_at, published_at
from watch_alley.journal_posts;

comment on view public.journal_posts is
  'Read-only view of watch_alley.journal_posts exposed to PostgREST. Public sees only status=published rows due to RLS.';

grant select on public.journal_posts to anon, authenticated;
-- security_invoker view: must also grant SELECT on the underlying table.
-- RLS still restricts non-admin callers to status='published' rows.
grant select on watch_alley.journal_posts to anon, authenticated;

-- ===========================================================================
-- 4. Admin RPCs
-- ===========================================================================

-- List every post (drafts + published). Admin-only.
create or replace function public.admin_list_journal_posts(
  status_filter text default null,
  limit_count int default 100
)
returns setof watch_alley.journal_posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select *
    from watch_alley.journal_posts
    where status_filter is null or status = status_filter
    order by coalesce(published_at, publish_at, updated_at) desc
    limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;
revoke all on function public.admin_list_journal_posts(text, int) from public, anon;
grant execute on function public.admin_list_journal_posts(text, int) to authenticated;

-- Upsert (create + update) a post. The UI can pass status='published' to
-- publish in one shot, or 'draft' to save quietly. published_at is stamped
-- automatically the first time a post flips to status='published'.
create or replace function public.admin_upsert_journal_post(payload jsonb)
returns watch_alley.journal_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_id uuid;
  resolved_status text;
  resolved_publish_at timestamptz;
  result_row watch_alley.journal_posts;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_id := nullif(payload->>'id', '')::uuid;
  resolved_status := coalesce(nullif(payload->>'status', ''), 'draft');
  resolved_publish_at := nullif(payload->>'publishAt', '')::timestamptz;

  insert into watch_alley.journal_posts (
    id, slug, title, summary, body_markdown, hero_image, tags,
    status, publish_at, author, read_minutes, published_at
  )
  values (
    coalesce(resolved_id, gen_random_uuid()),
    payload->>'slug',
    payload->>'title',
    payload->>'summary',
    coalesce(payload->>'bodyMarkdown', ''),
    nullif(payload->>'heroImage', ''),
    case
      when jsonb_typeof(payload->'tags') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(payload->'tags') as value)
      else '{}'
    end,
    resolved_status,
    resolved_publish_at,
    nullif(payload->>'author', ''),
    nullif(payload->>'readMinutes', '')::int,
    case when resolved_status = 'published' then now() else null end
  )
  on conflict (id) do update set
    slug = excluded.slug,
    title = excluded.title,
    summary = excluded.summary,
    body_markdown = excluded.body_markdown,
    hero_image = excluded.hero_image,
    tags = excluded.tags,
    status = excluded.status,
    publish_at = excluded.publish_at,
    author = excluded.author,
    read_minutes = excluded.read_minutes,
    -- Preserve the original published_at if the post was already published;
    -- stamp it now if the post is moving from draft/scheduled into published.
    published_at = case
      when excluded.status = 'published' and watch_alley.journal_posts.published_at is null then now()
      when excluded.status <> 'published' then null
      else watch_alley.journal_posts.published_at
    end
  returning * into result_row;

  return result_row;
end;
$$;
revoke all on function public.admin_upsert_journal_post(jsonb) from public, anon;
grant execute on function public.admin_upsert_journal_post(jsonb) to authenticated;

-- Delete a post by id.
create or replace function public.admin_delete_journal_post(post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from watch_alley.journal_posts where id = post_id;
  return found;
end;
$$;
revoke all on function public.admin_delete_journal_post(uuid) from public, anon;
grant execute on function public.admin_delete_journal_post(uuid) to authenticated;

-- ===========================================================================
-- 5. journal-images Storage bucket
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-images', 'journal-images', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Journal: admin insert" on storage.objects;
drop policy if exists "Journal: admin update" on storage.objects;
drop policy if exists "Journal: admin delete" on storage.objects;

create policy "Journal: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'journal-images' and watch_alley.is_admin());

create policy "Journal: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'journal-images' and watch_alley.is_admin())
  with check (bucket_id = 'journal-images' and watch_alley.is_admin());

create policy "Journal: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'journal-images' and watch_alley.is_admin());
