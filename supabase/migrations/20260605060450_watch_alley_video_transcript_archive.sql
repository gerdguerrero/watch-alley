-- Watch Alley video transcript archive + journal draft provenance (2026-06-05).
--
-- Purpose:
-- - Keep raw/processed social-video transcripts separate from public Journal posts.
-- - Preserve source provenance for AI-assisted article drafts.
-- - Let Journal posts remain the final reviewed publishing surface.
--
-- Idempotent. Safe to re-run.

-- ===========================================================================
-- 1. Source videos / social posts
-- ===========================================================================

create table if not exists watch_alley.content_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'video'
    check (source_type in ('video','audio','article','post','other')),
  platform text not null default 'other'
    check (platform in ('facebook','instagram','tiktok','youtube','x','local','other')),
  source_url text not null,
  canonical_url text,
  external_id text,
  client_account text not null default 'the-watch-alley',
  title text,
  description text,
  uploader text,
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  published_at timestamptz,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ingested'
    check (status in ('ingested','transcribed','analyzed','drafted','published','error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table watch_alley.content_sources is
  'Private archive of source videos/social posts used for transcripts and Journal article drafts. Not exposed publicly.';

create unique index if not exists content_sources_platform_external_id_uidx
  on watch_alley.content_sources (platform, external_id)
  where external_id is not null;

create unique index if not exists content_sources_canonical_url_uidx
  on watch_alley.content_sources (canonical_url)
  where canonical_url is not null;

create index if not exists content_sources_status_created_idx
  on watch_alley.content_sources (status, created_at desc);

create index if not exists content_sources_client_created_idx
  on watch_alley.content_sources (client_account, created_at desc);

drop trigger if exists content_sources_set_updated_at on watch_alley.content_sources;
create trigger content_sources_set_updated_at
  before update on watch_alley.content_sources
  for each row execute function watch_alley.set_updated_at();

-- ===========================================================================
-- 2. Transcript runs
-- ===========================================================================

create table if not exists watch_alley.transcript_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references watch_alley.content_sources(id) on delete cascade,
  run_type text not null default 'asr'
    check (run_type in ('caption','asr','manual','corrected')),
  provider text not null default 'unknown',
  model text,
  language text,
  asr_prompt text,
  terms text[] not null default '{}',
  transcript_text text not null default '',
  transcript_markdown text not null default '',
  segments jsonb not null default '[]'::jsonb,
  raw_json jsonb not null default '{}'::jsonb,
  corrections jsonb not null default '[]'::jsonb,
  sha256 text,
  is_preferred boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table watch_alley.transcript_runs is
  'Append-only transcript attempts for each source video. Re-runs are preserved instead of overwriting raw ASR output.';

create index if not exists transcript_runs_source_created_idx
  on watch_alley.transcript_runs (source_id, created_at desc);

create index if not exists transcript_runs_preferred_idx
  on watch_alley.transcript_runs (source_id, is_preferred)
  where is_preferred;

create index if not exists transcript_runs_sha256_idx
  on watch_alley.transcript_runs (sha256)
  where sha256 is not null;

-- ===========================================================================
-- 3. Video artifacts
-- ===========================================================================

create table if not exists watch_alley.video_artifacts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references watch_alley.content_sources(id) on delete cascade,
  transcript_run_id uuid references watch_alley.transcript_runs(id) on delete set null,
  kind text not null
    check (kind in ('video','audio','contact_sheet','sample_frame','scene_frame','ocr','report','transcript_markdown','transcript_json','metadata_json','frames_manifest','other')),
  bucket text,
  storage_path text,
  public_url text,
  local_path text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table watch_alley.video_artifacts is
  'Private references to local or Supabase Storage artifacts generated while processing source videos.';

create index if not exists video_artifacts_source_kind_idx
  on watch_alley.video_artifacts (source_id, kind, created_at desc);

create index if not exists video_artifacts_transcript_idx
  on watch_alley.video_artifacts (transcript_run_id)
  where transcript_run_id is not null;

-- ===========================================================================
-- 4. Article-generation runs
-- ===========================================================================

create table if not exists watch_alley.article_generation_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references watch_alley.content_sources(id) on delete cascade,
  transcript_run_id uuid references watch_alley.transcript_runs(id) on delete set null,
  journal_post_id uuid references watch_alley.journal_posts(id) on delete set null,
  angle text not null default 'event-recap',
  prompt_version text not null default 'watch-alley-video-journal-v1',
  brief text,
  output_title text,
  output_slug text,
  output_summary text,
  output_tags text[] not null default '{}',
  output_body_markdown text,
  fact_check_notes jsonb not null default '[]'::jsonb,
  quality_status text not null default 'needs_review'
    check (quality_status in ('drafted','needs_review','approved','rejected','published','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table watch_alley.article_generation_runs is
  'AI-assisted Journal article drafts generated from archived transcripts. Final public publishing still happens through watch_alley.journal_posts.';

create index if not exists article_generation_runs_source_created_idx
  on watch_alley.article_generation_runs (source_id, created_at desc);

create index if not exists article_generation_runs_journal_post_idx
  on watch_alley.article_generation_runs (journal_post_id)
  where journal_post_id is not null;

drop trigger if exists article_generation_runs_set_updated_at on watch_alley.article_generation_runs;
create trigger article_generation_runs_set_updated_at
  before update on watch_alley.article_generation_runs
  for each row execute function watch_alley.set_updated_at();

-- ===========================================================================
-- 5. RLS posture: private tables, admin access through RPCs / trusted tooling
-- ===========================================================================

alter table watch_alley.content_sources enable row level security;
alter table watch_alley.transcript_runs enable row level security;
alter table watch_alley.video_artifacts enable row level security;
alter table watch_alley.article_generation_runs enable row level security;

-- No direct anon/authenticated policies are created. These tables stay private
-- unless explicitly surfaced through SECURITY DEFINER admin RPCs below.

-- ===========================================================================
-- 6. Private Storage bucket for generated video artifacts
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-artifacts',
  'video-artifacts',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','text/plain','text/markdown','application/json','video/mp4','audio/wav','audio/mpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Video artifacts: admin select" on storage.objects;
drop policy if exists "Video artifacts: admin insert" on storage.objects;
drop policy if exists "Video artifacts: admin update" on storage.objects;
drop policy if exists "Video artifacts: admin delete" on storage.objects;

create policy "Video artifacts: admin select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'video-artifacts' and watch_alley.is_admin());

create policy "Video artifacts: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'video-artifacts' and watch_alley.is_admin());

create policy "Video artifacts: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'video-artifacts' and watch_alley.is_admin())
  with check (bucket_id = 'video-artifacts' and watch_alley.is_admin());

create policy "Video artifacts: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'video-artifacts' and watch_alley.is_admin());

-- ===========================================================================
-- 7. Admin read RPCs for future Admin UI surfaces
-- ===========================================================================

create or replace function public.admin_list_content_sources(
  status_filter text default null,
  limit_count int default 100
)
returns setof watch_alley.content_sources
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
    from watch_alley.content_sources
    where status_filter is null or status = status_filter
    order by created_at desc
    limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;
revoke all on function public.admin_list_content_sources(text, int) from public, anon;
grant execute on function public.admin_list_content_sources(text, int) to authenticated;

create or replace function public.admin_list_transcript_runs(
  source_id_filter uuid default null,
  limit_count int default 100
)
returns setof watch_alley.transcript_runs
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
    from watch_alley.transcript_runs
    where source_id_filter is null or source_id = source_id_filter
    order by created_at desc
    limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;
revoke all on function public.admin_list_transcript_runs(uuid, int) from public, anon;
grant execute on function public.admin_list_transcript_runs(uuid, int) to authenticated;

create or replace function public.admin_list_article_generation_runs(
  source_id_filter uuid default null,
  limit_count int default 100
)
returns setof watch_alley.article_generation_runs
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
    from watch_alley.article_generation_runs
    where source_id_filter is null or source_id = source_id_filter
    order by created_at desc
    limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;
revoke all on function public.admin_list_article_generation_runs(uuid, int) from public, anon;
grant execute on function public.admin_list_article_generation_runs(uuid, int) to authenticated;
;
