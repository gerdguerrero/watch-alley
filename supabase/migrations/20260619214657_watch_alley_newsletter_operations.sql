-- Watch Alley newsletter operations foundation (2026-06-20)
--
-- Implements the addendum's durable substrate:
-- newsletter issues, issue items, AI generation runs, send logs, and reusable
-- evergreen content. Admin writes go through allowlist-gated RPCs. Public
-- reads are limited to sent/archived issues via security-invoker views.

-- ===========================================================================
-- 1. Tables
-- ===========================================================================

create table if not exists watch_alley.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 140),
  internal_title text not null check (length(trim(internal_title)) between 1 and 240),
  public_title text not null check (length(trim(public_title)) between 1 and 240),
  subject text not null check (length(trim(subject)) between 1 and 180),
  preheader text check (preheader is null or length(trim(preheader)) <= 240),
  intro_html text,
  body_html text,
  body_text text,
  status text not null default 'draft'
    check (status in ('draft','needs_review','approved','scheduled','sending','sent','archived','rejected','failed')),
  source_type text not null default 'manual'
    check (source_type in ('manual','ai_assisted','ai_generated','system_scaffold')),
  hero_image_url text,
  hero_image_prompt text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by_email text,
  approved_by_email text,
  approved_at timestamptz,
  archive_visible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_scheduled_requires_time
    check (status <> 'scheduled' or scheduled_at is not null),
  constraint newsletter_sent_requires_sent_at
    check (status not in ('sent','archived') or sent_at is not null),
  constraint newsletter_scheduled_requires_approval
    check (status <> 'scheduled' or approved_at is not null),
  constraint newsletter_sending_requires_approval
    check (status <> 'sending' or approved_at is not null)
);

comment on table watch_alley.newsletter_issues is
  'The Watch List newsletter issues. AI may create drafts only; admin approval is required before scheduling/sending.';

create index if not exists newsletter_issues_status_created_idx
  on watch_alley.newsletter_issues (status, created_at desc);
create index if not exists newsletter_issues_scheduled_idx
  on watch_alley.newsletter_issues (scheduled_at)
  where status = 'scheduled';
create index if not exists newsletter_issues_archive_idx
  on watch_alley.newsletter_issues (sent_at desc)
  where archive_visible = true and status in ('sent','archived');

drop trigger if exists newsletter_issues_set_updated_at on watch_alley.newsletter_issues;
create trigger newsletter_issues_set_updated_at
  before update on watch_alley.newsletter_issues
  for each row execute function watch_alley.set_updated_at();

create table if not exists watch_alley.newsletter_issue_items (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references watch_alley.newsletter_issues(id) on delete cascade,
  item_type text not null
    check (item_type in ('available_watch','sold_watch','journal_post','custom_note','sourcing_cta','primary_cta','secondary_cta')),
  item_id text,
  title text not null check (length(trim(title)) between 1 and 240),
  summary text check (summary is null or length(trim(summary)) <= 2000),
  url text,
  image_url text,
  position int not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists newsletter_issue_items_issue_position_idx
  on watch_alley.newsletter_issue_items (issue_id, position asc);

create table if not exists watch_alley.ai_generation_runs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references watch_alley.newsletter_issues(id) on delete set null,
  run_type text not null
    check (run_type in ('full_issue','subject_lines','intro','image_prompt','hero_image','section','system_scaffold')),
  model text,
  prompt_version text,
  input_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(input_payload) = 'object'),
  output_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(output_payload) = 'object'),
  status text not null default 'completed' check (status in ('queued','running','completed','failed','skipped')),
  error_message text,
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists ai_generation_runs_issue_created_idx
  on watch_alley.ai_generation_runs (issue_id, created_at desc);

create table if not exists watch_alley.newsletter_send_logs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references watch_alley.newsletter_issues(id) on delete cascade,
  provider text,
  provider_campaign_id text,
  status text not null check (status in ('test_sent','sending','sent','failed','skipped')),
  recipient_count int check (recipient_count is null or recipient_count >= 0),
  sent_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_send_logs_issue_created_idx
  on watch_alley.newsletter_send_logs (issue_id, created_at desc);

create table if not exists watch_alley.evergreen_content_library (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 240),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 140),
  category text check (category is null or category in ('beginner','buying_guide','brand_note','maintenance','market_note','sourcing','archive')),
  body text not null check (length(trim(body)) between 1 and 200000),
  summary text check (summary is null or length(trim(summary)) <= 1000),
  status text not null default 'active' check (status in ('active','draft','retired')),
  last_used_at timestamptz,
  times_used int not null default 0 check (times_used >= 0),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evergreen_content_status_category_idx
  on watch_alley.evergreen_content_library (status, category, updated_at desc);

drop trigger if exists evergreen_content_library_set_updated_at on watch_alley.evergreen_content_library;
create trigger evergreen_content_library_set_updated_at
  before update on watch_alley.evergreen_content_library
  for each row execute function watch_alley.set_updated_at();

-- ===========================================================================
-- 2. RLS posture
-- ===========================================================================

alter table watch_alley.newsletter_issues enable row level security;
alter table watch_alley.newsletter_issue_items enable row level security;
alter table watch_alley.ai_generation_runs enable row level security;
alter table watch_alley.newsletter_send_logs enable row level security;
alter table watch_alley.evergreen_content_library enable row level security;

drop policy if exists "Public read archived newsletter issues" on watch_alley.newsletter_issues;
create policy "Public read archived newsletter issues"
  on watch_alley.newsletter_issues
  for select
  to anon, authenticated
  using (archive_visible = true and status in ('sent','archived'));

drop policy if exists "Public read archived newsletter items" on watch_alley.newsletter_issue_items;
create policy "Public read archived newsletter items"
  on watch_alley.newsletter_issue_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from watch_alley.newsletter_issues i
      where i.id = issue_id
        and i.archive_visible = true
        and i.status in ('sent','archived')
    )
  );

drop policy if exists "Deny direct newsletter issue writes" on watch_alley.newsletter_issues;
create policy "Deny direct newsletter issue writes"
  on watch_alley.newsletter_issues for insert to anon, authenticated with check (false);
drop policy if exists "Deny direct newsletter issue updates" on watch_alley.newsletter_issues;
create policy "Deny direct newsletter issue updates"
  on watch_alley.newsletter_issues for update to anon, authenticated using (false) with check (false);
drop policy if exists "Deny direct newsletter issue deletes" on watch_alley.newsletter_issues;
create policy "Deny direct newsletter issue deletes"
  on watch_alley.newsletter_issues for delete to anon, authenticated using (false);

drop policy if exists "Deny direct newsletter item writes" on watch_alley.newsletter_issue_items;
create policy "Deny direct newsletter item writes"
  on watch_alley.newsletter_issue_items for insert to anon, authenticated with check (false);
drop policy if exists "Deny direct newsletter item updates" on watch_alley.newsletter_issue_items;
create policy "Deny direct newsletter item updates"
  on watch_alley.newsletter_issue_items for update to anon, authenticated using (false) with check (false);
drop policy if exists "Deny direct newsletter item deletes" on watch_alley.newsletter_issue_items;
create policy "Deny direct newsletter item deletes"
  on watch_alley.newsletter_issue_items for delete to anon, authenticated using (false);

drop policy if exists "Deny all direct AI generation access" on watch_alley.ai_generation_runs;
create policy "Deny all direct AI generation access"
  on watch_alley.ai_generation_runs for all to anon, authenticated using (false) with check (false);

drop policy if exists "Deny all direct send log access" on watch_alley.newsletter_send_logs;
create policy "Deny all direct send log access"
  on watch_alley.newsletter_send_logs for all to anon, authenticated using (false) with check (false);

drop policy if exists "Deny all direct evergreen writes" on watch_alley.evergreen_content_library;
create policy "Deny all direct evergreen writes"
  on watch_alley.evergreen_content_library for all to anon, authenticated using (false) with check (false);

-- Security-invoker views still require underlying SELECT grants. RLS narrows
-- anon/authenticated callers to sent/archived public rows.
grant select on watch_alley.newsletter_issues to anon, authenticated;
grant select on watch_alley.newsletter_issue_items to anon, authenticated;

-- ===========================================================================
-- 3. Public archive views
-- ===========================================================================

drop view if exists public.newsletter_issue_items;
drop view if exists public.newsletter_issues;

create view public.newsletter_issues
with (security_invoker = true)
as
select
  id, slug, public_title, subject, preheader, intro_html, body_html, body_text,
  hero_image_url, sent_at, created_at, updated_at
from watch_alley.newsletter_issues
where archive_visible = true and status in ('sent','archived');

create view public.newsletter_issue_items
with (security_invoker = true)
as
select
  it.id, it.issue_id, it.item_type, it.item_id, it.title, it.summary,
  it.url, it.image_url, it.position, it.created_at
from watch_alley.newsletter_issue_items it
join watch_alley.newsletter_issues i on i.id = it.issue_id
where i.archive_visible = true and i.status in ('sent','archived');

grant select on public.newsletter_issues to anon, authenticated;
grant select on public.newsletter_issue_items to anon, authenticated;

comment on view public.newsletter_issues is
  'Public archive view for sent/archived Watch List issues.';
comment on view public.newsletter_issue_items is
  'Public archive items for sent/archived Watch List issues.';

-- ===========================================================================
-- 4. Admin helper and RPCs
-- ===========================================================================

create or replace function watch_alley.newsletter_issue_json(issue_row watch_alley.newsletter_issues)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'issue', to_jsonb(issue_row),
    'items', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.position asc, item.created_at asc)
      from watch_alley.newsletter_issue_items item
      where item.issue_id = issue_row.id
    ), '[]'::jsonb),
    'aiGenerationRuns', coalesce((
      select jsonb_agg(to_jsonb(run) order by run.created_at desc)
      from watch_alley.ai_generation_runs run
      where run.issue_id = issue_row.id
    ), '[]'::jsonb),
    'sendLogs', coalesce((
      select jsonb_agg(to_jsonb(log) order by log.created_at desc)
      from watch_alley.newsletter_send_logs log
      where log.issue_id = issue_row.id
    ), '[]'::jsonb)
  );
$$;

revoke all on function watch_alley.newsletter_issue_json(watch_alley.newsletter_issues) from public, anon, authenticated;

create or replace function public.admin_list_newsletter_issues(
  status_filter text default null,
  limit_count int default 100
)
returns setof watch_alley.newsletter_issues
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
    from watch_alley.newsletter_issues
    where status_filter is null or status = status_filter
    order by coalesce(scheduled_at, sent_at, updated_at, created_at) desc
    limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;
revoke all on function public.admin_list_newsletter_issues(text, int) from public, anon;
grant execute on function public.admin_list_newsletter_issues(text, int) to authenticated;

create or replace function public.admin_get_newsletter_issue(issue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.newsletter_issues;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into result_row
  from watch_alley.newsletter_issues
  where id = issue_id;

  if result_row.id is null then
    raise exception 'Newsletter issue not found' using errcode = 'P0002';
  end if;

  return watch_alley.newsletter_issue_json(result_row);
end;
$$;
revoke all on function public.admin_get_newsletter_issue(uuid) from public, anon;
grant execute on function public.admin_get_newsletter_issue(uuid) to authenticated;

create or replace function public.admin_upsert_newsletter_issue(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  resolved_id uuid;
  resolved_status text;
  result_row watch_alley.newsletter_issues;
  item jsonb;
  item_position int;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  caller_email := lower(coalesce(auth.email(), ''));
  resolved_id := nullif(payload->>'id', '')::uuid;
  resolved_status := coalesce(nullif(payload->>'status', ''), 'draft');

  if resolved_status in ('approved','scheduled','sending','sent','archived') then
    raise exception 'Use the status workflow RPC for approval, scheduling, and sending' using errcode = '42501';
  end if;

  insert into watch_alley.newsletter_issues (
    id, slug, internal_title, public_title, subject, preheader, intro_html,
    body_html, body_text, status, source_type, hero_image_url, hero_image_prompt,
    scheduled_at, archive_visible, metadata, created_by_email
  )
  values (
    coalesce(resolved_id, gen_random_uuid()),
    trim(payload->>'slug'),
    trim(payload->>'internalTitle'),
    trim(payload->>'publicTitle'),
    trim(payload->>'subject'),
    nullif(trim(payload->>'preheader'), ''),
    nullif(payload->>'introHtml', ''),
    nullif(payload->>'bodyHtml', ''),
    nullif(payload->>'bodyText', ''),
    resolved_status,
    coalesce(nullif(trim(payload->>'sourceType'), ''), 'manual'),
    nullif(trim(payload->>'heroImageUrl'), ''),
    nullif(trim(payload->>'heroImagePrompt'), ''),
    nullif(payload->>'scheduledAt', '')::timestamptz,
    case lower(coalesce(payload->>'archiveVisible', ''))
      when 'true' then true
      when 'false' then false
      else false
    end,
    case when jsonb_typeof(payload->'metadata') = 'object' then payload->'metadata' else '{}'::jsonb end,
    caller_email
  )
  on conflict (id) do update set
    slug = excluded.slug,
    internal_title = excluded.internal_title,
    public_title = excluded.public_title,
    subject = excluded.subject,
    preheader = excluded.preheader,
    intro_html = excluded.intro_html,
    body_html = excluded.body_html,
    body_text = excluded.body_text,
    status = excluded.status,
    source_type = excluded.source_type,
    hero_image_url = excluded.hero_image_url,
    hero_image_prompt = excluded.hero_image_prompt,
    scheduled_at = excluded.scheduled_at,
    archive_visible = excluded.archive_visible,
    metadata = excluded.metadata
  returning * into result_row;

  if payload ? 'items' and jsonb_typeof(payload->'items') = 'array' then
    delete from watch_alley.newsletter_issue_items where issue_id = result_row.id;

    item_position := 0;
    for item in select * from jsonb_array_elements(payload->'items')
    loop
      insert into watch_alley.newsletter_issue_items (
        issue_id, item_type, item_id, title, summary, url, image_url, position, metadata
      )
      values (
        result_row.id,
        coalesce(nullif(trim(item->>'itemType'), ''), 'custom_note'),
        nullif(trim(item->>'itemId'), ''),
        trim(item->>'title'),
        nullif(trim(item->>'summary'), ''),
        nullif(trim(item->>'url'), ''),
        nullif(trim(item->>'imageUrl'), ''),
        coalesce(nullif(item->>'position', '')::int, item_position),
        case when jsonb_typeof(item->'metadata') = 'object' then item->'metadata' else '{}'::jsonb end
      );
      item_position := item_position + 1;
    end loop;
  end if;

  return watch_alley.newsletter_issue_json(result_row);
end;
$$;
revoke all on function public.admin_upsert_newsletter_issue(jsonb) from public, anon;
grant execute on function public.admin_upsert_newsletter_issue(jsonb) to authenticated;

create or replace function public.admin_update_newsletter_issue_status(
  issue_id uuid,
  new_status text,
  scheduled_for timestamptz default null,
  archive_public boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  current_issue watch_alley.newsletter_issues;
  result_row watch_alley.newsletter_issues;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if new_status not in ('draft','needs_review','approved','scheduled','rejected','archived','failed') then
    raise exception 'Invalid admin status transition' using errcode = '22023';
  end if;

  caller_email := lower(coalesce(auth.email(), ''));
  select * into current_issue from watch_alley.newsletter_issues where id = issue_id;
  if current_issue.id is null then
    raise exception 'Newsletter issue not found' using errcode = 'P0002';
  end if;
  if current_issue.status = 'sending' then
    raise exception 'Cannot update an issue while it is sending' using errcode = '42501';
  end if;
  if current_issue.status = 'sent' and new_status <> 'archived' then
    raise exception 'Sent issues may only be archived' using errcode = '42501';
  end if;

  update watch_alley.newsletter_issues
  set status = new_status,
      approved_by_email = case
        when new_status in ('approved','scheduled') then caller_email
        when new_status in ('draft','needs_review','rejected') then null
        else approved_by_email
      end,
      approved_at = case
        when new_status in ('approved','scheduled') then coalesce(approved_at, now())
        when new_status in ('draft','needs_review','rejected') then null
        else approved_at
      end,
      scheduled_at = case
        when new_status = 'scheduled' then scheduled_for
        when new_status in ('draft','needs_review','approved','rejected','failed') then null
        else scheduled_at
      end,
      archive_visible = coalesce(archive_public, archive_visible)
  where id = issue_id
  returning * into result_row;

  return watch_alley.newsletter_issue_json(result_row);
end;
$$;
revoke all on function public.admin_update_newsletter_issue_status(uuid, text, timestamptz, boolean) from public, anon;
grant execute on function public.admin_update_newsletter_issue_status(uuid, text, timestamptz, boolean) to authenticated;

create or replace function public.admin_delete_newsletter_issue(issue_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select status into current_status from watch_alley.newsletter_issues where id = issue_id;
  if current_status in ('sending','sent','archived') then
    raise exception 'Cannot delete sending, sent, or archived issues' using errcode = '42501';
  end if;

  delete from watch_alley.newsletter_issues where id = issue_id;
  return found;
end;
$$;
revoke all on function public.admin_delete_newsletter_issue(uuid) from public, anon;
grant execute on function public.admin_delete_newsletter_issue(uuid) to authenticated;

create or replace function public.admin_log_ai_generation_run(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  result_row watch_alley.ai_generation_runs;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  caller_email := lower(coalesce(auth.email(), ''));
  insert into watch_alley.ai_generation_runs (
    issue_id, run_type, model, prompt_version, input_payload, output_payload,
    status, error_message, created_by_email
  )
  values (
    nullif(payload->>'issueId', '')::uuid,
    coalesce(nullif(payload->>'runType', ''), 'system_scaffold'),
    nullif(payload->>'model', ''),
    nullif(payload->>'promptVersion', ''),
    case when jsonb_typeof(payload->'inputPayload') = 'object' then payload->'inputPayload' else '{}'::jsonb end,
    case when jsonb_typeof(payload->'outputPayload') = 'object' then payload->'outputPayload' else '{}'::jsonb end,
    coalesce(nullif(payload->>'status', ''), 'completed'),
    nullif(payload->>'errorMessage', ''),
    caller_email
  )
  returning * into result_row;

  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_log_ai_generation_run(jsonb) from public, anon;
grant execute on function public.admin_log_ai_generation_run(jsonb) to authenticated;

create or replace function public.admin_log_newsletter_send(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  result_row watch_alley.newsletter_send_logs;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  caller_email := lower(coalesce(auth.email(), ''));
  insert into watch_alley.newsletter_send_logs (
    issue_id, provider, provider_campaign_id, status, recipient_count,
    sent_at, error_message, metadata, created_by_email
  )
  values (
    (payload->>'issueId')::uuid,
    nullif(payload->>'provider', ''),
    nullif(payload->>'providerCampaignId', ''),
    coalesce(nullif(payload->>'status', ''), 'skipped'),
    nullif(payload->>'recipientCount', '')::int,
    nullif(payload->>'sentAt', '')::timestamptz,
    nullif(payload->>'errorMessage', ''),
    case when jsonb_typeof(payload->'metadata') = 'object' then payload->'metadata' else '{}'::jsonb end,
    caller_email
  )
  returning * into result_row;

  return to_jsonb(result_row);
end;
$$;
revoke all on function public.admin_log_newsletter_send(jsonb) from public, anon;
grant execute on function public.admin_log_newsletter_send(jsonb) to authenticated;

-- Service-role-only helper for cron/email workers. The route handler must
-- verify NEWSLETTER_CRON_SECRET before calling this.
create or replace function public.service_list_due_newsletter_issues(limit_count int default 10)
returns setof watch_alley.newsletter_issues
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  return query
    select *
    from watch_alley.newsletter_issues
    where status = 'scheduled'
      and approved_at is not null
      and scheduled_at <= now()
    order by scheduled_at asc
    limit greatest(1, least(coalesce(limit_count, 10), 50));
end;
$$;
revoke all on function public.service_list_due_newsletter_issues(int) from public, anon, authenticated;
grant execute on function public.service_list_due_newsletter_issues(int) to service_role;
