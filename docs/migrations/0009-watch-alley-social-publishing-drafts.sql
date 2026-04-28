-- Watch Alley social publishing drafts (2026-04-28).
-- Phase A bridge to Phase B of the controlled Meta social publishing plan
-- (docs/plans/2026-04-28-controlled-meta-social-publishing.md).
--
-- Stores per-watch / per-platform Facebook + Instagram caption drafts so
-- the owner can prepare social copy ahead of time and pick up where they
-- left off. Phase A intentionally writes only `status = 'draft'`; the
-- columns for `published_at`, `external_post_id`, `external_post_url`,
-- and the error fields exist now so Phase B can flip a draft to
-- `status = 'published'` without a schema migration. No Meta tokens,
-- secrets, or app credentials are stored here — those live exclusively
-- in Supabase Edge Function secrets when Phase B lands.
--
-- Idempotent: every step uses CREATE/REPLACE/IF NOT EXISTS / ON CONFLICT.

-- ===========================================================================
-- 1. social_posts table (one row per (watch_id, platform))
-- ===========================================================================

create table if not exists watch_alley.social_posts (
  id uuid primary key default gen_random_uuid(),
  watch_id text not null references watch_alley.watches(id) on delete cascade,
  platform text not null check (platform in ('facebook','instagram')),
  status text not null default 'draft' check (status in ('draft','queued','publishing','published','failed','skipped')),
  caption text not null check (length(caption) <= 8000),
  media_urls text[] not null default '{}'::text[],
  external_post_id text,
  external_post_url text,
  published_at timestamptz,
  error_code text,
  error_message text,
  created_by text,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watch_id, platform)
);

comment on table watch_alley.social_posts is
  'Per-watch Facebook/Instagram social drafts and (eventually) published-post state. Phase A stores draft captions only; Phase B will flip rows to status=published with external ids/urls. No Meta tokens or secrets ever stored here.';
comment on column watch_alley.social_posts.media_urls is
  'Ordered list of media URLs to use when publishing. Defaults to empty so a draft can be saved before media is finalized.';
comment on column watch_alley.social_posts.external_post_id is
  'Phase B: Meta post id once published. Null for Phase A drafts.';
comment on column watch_alley.social_posts.external_post_url is
  'Phase B: public Meta post URL once published. Null for Phase A drafts.';

create index if not exists social_posts_watch_id_idx
  on watch_alley.social_posts (watch_id);
create index if not exists social_posts_status_updated_idx
  on watch_alley.social_posts (status, updated_at desc);

drop trigger if exists social_posts_set_updated_at on watch_alley.social_posts;
create trigger social_posts_set_updated_at
  before update on watch_alley.social_posts
  for each row execute function watch_alley.set_updated_at();

-- ===========================================================================
-- 2. RLS — deny all direct access. Reads/writes go through admin RPCs.
-- ===========================================================================

alter table watch_alley.social_posts enable row level security;

drop policy if exists "Deny all direct access" on watch_alley.social_posts;
create policy "Deny all direct access"
  on watch_alley.social_posts
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ===========================================================================
-- 3. Admin RPCs (SECURITY DEFINER, gated by is_admin(), search_path pinned)
-- ===========================================================================

-- Upsert a draft caption for a (watch_id, platform). Phase A writes
-- status='draft' only; Phase B will introduce a separate
-- admin_publish_social_post(...) RPC that handles state transitions to
-- 'queued'/'publishing'/'published'/'failed' alongside the Meta Graph
-- API call from a Supabase Edge Function.
create or replace function public.admin_save_social_draft(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  resolved_watch_id text;
  resolved_platform text;
  resolved_caption text;
  resolved_media_urls text[];
  result_row watch_alley.social_posts;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  resolved_watch_id := nullif(trim(payload->>'watchId'), '');
  resolved_platform := lower(nullif(trim(payload->>'platform'), ''));
  resolved_caption := payload->>'caption';

  if resolved_watch_id is null then
    raise exception 'watchId is required' using errcode = '22023';
  end if;
  if resolved_platform is null or resolved_platform not in ('facebook','instagram') then
    raise exception 'platform must be facebook or instagram' using errcode = '22023';
  end if;
  if resolved_caption is null or length(trim(resolved_caption)) = 0 then
    raise exception 'caption is required' using errcode = '22023';
  end if;
  if length(resolved_caption) > 8000 then
    raise exception 'caption is too long (max 8000 characters)' using errcode = '22023';
  end if;

  if not exists (select 1 from watch_alley.watches w where w.id = resolved_watch_id) then
    raise exception 'watchId does not match any watch' using errcode = 'P0002';
  end if;

  if jsonb_typeof(payload->'mediaUrls') = 'array' then
    select coalesce(array_agg(value), '{}'::text[])
      into resolved_media_urls
    from jsonb_array_elements_text(payload->'mediaUrls') as value
    where value is not null and length(trim(value)) > 0;
  else
    resolved_media_urls := '{}'::text[];
  end if;

  caller_email := lower(coalesce(auth.email(), ''));

  insert into watch_alley.social_posts (
    watch_id, platform, caption, media_urls, status, created_by, approved_by
  )
  values (
    resolved_watch_id,
    resolved_platform,
    resolved_caption,
    coalesce(resolved_media_urls, '{}'::text[]),
    'draft',
    nullif(caller_email, ''),
    nullif(caller_email, '')
  )
  on conflict (watch_id, platform) do update set
    caption = excluded.caption,
    media_urls = excluded.media_urls,
    -- keep status in 'draft' on re-save unless the row was already
    -- terminal (published/failed/skipped). Phase A only ever writes
    -- 'draft' so this guard is here for Phase B re-edits.
    status = case
      when watch_alley.social_posts.status in ('published','failed','skipped')
        then watch_alley.social_posts.status
      else 'draft'
    end,
    approved_by = nullif(caller_email, '')
  returning * into result_row;

  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_save_social_draft(jsonb) from public, anon;
grant execute on function public.admin_save_social_draft(jsonb) to authenticated;

-- List all social drafts/posts for one watch (both platforms). Returns
-- an empty array when no drafts exist yet — the admin UI uses that to
-- decide whether to show generated previews vs saved drafts.
create or replace function public.admin_list_social_drafts_for_watch(target_watch_id text)
returns setof watch_alley.social_posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if target_watch_id is null or length(trim(target_watch_id)) = 0 then
    raise exception 'target_watch_id is required' using errcode = '22023';
  end if;

  return query
    select *
    from watch_alley.social_posts
    where watch_id = target_watch_id
    order by platform asc;
end;
$$;
revoke all on function public.admin_list_social_drafts_for_watch(text) from public, anon;
grant execute on function public.admin_list_social_drafts_for_watch(text) to authenticated;

-- Hard-delete a draft for (watch_id, platform). Useful when an owner
-- wants to start fresh from generated previews. Returns true if a row
-- was deleted, false otherwise.
create or replace function public.admin_delete_social_draft(
  target_watch_id text,
  target_platform text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_platform text;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if target_watch_id is null or length(trim(target_watch_id)) = 0 then
    raise exception 'target_watch_id is required' using errcode = '22023';
  end if;
  normalized_platform := lower(coalesce(trim(target_platform), ''));
  if normalized_platform not in ('facebook','instagram') then
    raise exception 'target_platform must be facebook or instagram' using errcode = '22023';
  end if;

  delete from watch_alley.social_posts
  where watch_id = target_watch_id
    and platform = normalized_platform;

  return found;
end;
$$;
revoke all on function public.admin_delete_social_draft(text, text) from public, anon;
grant execute on function public.admin_delete_social_draft(text, text) to authenticated;

-- Reload PostgREST schema so the new RPCs are immediately callable.
notify pgrst, 'reload schema';
