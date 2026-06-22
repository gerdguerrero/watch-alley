alter table watch_alley.inquiries
  add column if not exists lost_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inquiries_lost_reason_values'
  ) then
    alter table watch_alley.inquiries
      add constraint inquiries_lost_reason_values
      check (
        lost_reason is null
        or lost_reason in ('price','condition','sold_elsewhere','no_response','timing','other')
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inquiries_lost_reason_required_when_lost'
  ) then
    alter table watch_alley.inquiries
      add constraint inquiries_lost_reason_required_when_lost
      check (
        (status = 'lost' and lost_reason is not null)
        or (status <> 'lost' and lost_reason is null)
      );
  end if;
end$$;

comment on column watch_alley.inquiries.lost_reason is
  'Reason an inquiry transitioned to status=lost. Required when status=lost; null otherwise. One of: price, condition, sold_elsewhere, no_response, timing, other.';

drop function if exists public.admin_update_inquiry_status(uuid, text, text);

create or replace function public.admin_update_inquiry_status(
  inquiry_id uuid,
  new_status text,
  note text default null,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row watch_alley.inquiries;
  resolved_reason text;
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if new_status not in ('new','contacted','viewing','reserved','sold','lost','spam') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  if new_status = 'lost' then
    resolved_reason := nullif(trim(coalesce(reason, '')), '');
    if resolved_reason is null then
      raise exception 'A lost reason is required when transitioning to status=lost'
        using errcode = '22023';
    end if;
    if resolved_reason not in ('price','condition','sold_elsewhere','no_response','timing','other') then
      raise exception 'Invalid lost reason: %', resolved_reason using errcode = '22023';
    end if;
  else
    resolved_reason := null;
  end if;

  update watch_alley.inquiries
  set status = new_status,
      status_note = coalesce(note, status_note),
      lost_reason = resolved_reason,
      responded_at = case
        when new_status = 'contacted' and responded_at is null then now()
        else responded_at end,
      closed_at = case
        when new_status in ('sold','lost','spam') and closed_at is null then now()
        else closed_at end
  where id = inquiry_id
  returning * into result_row;

  if result_row.id is null then
    raise exception 'Inquiry not found' using errcode = 'P0002';
  end if;
  return to_jsonb(result_row);
end;
$$;

revoke all on function public.admin_update_inquiry_status(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_inquiry_status(uuid, text, text, text) to authenticated;

comment on function public.admin_update_inquiry_status(uuid, text, text, text) is
  'Admin status transition. Requires a lost reason whenever new_status=lost. Stamps responded_at/closed_at automatically.';;
