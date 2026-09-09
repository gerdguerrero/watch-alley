-- The Watch Alley: order the admin newsletter list by what needs attention.
--
-- The previous ordering was `coalesce(scheduled_at, sent_at, updated_at,
-- created_at) desc` across all statuses at once, which has two problems.
--
-- First, the working set is buried. The admin panel lists every issue ever
-- created in one flat list: at the time of writing that is 1 draft, 5 awaiting
-- review, 6 rejected and 13 sent. The one being worked on is a needle in it.
--
-- Second, the sort key is fragile. A `sent` issue keeps its old `sent_at` as
-- its key forever, so editing it does not surface it. A `scheduled` issue with
-- a future date floats above everything, including a draft edited a minute ago.
--
-- The fix orders by state first, newest within each state:
--
--   0  sending       in flight; if anything needs eyes it is this
--   1  scheduled     about to go out
--   2  draft         being written
--   3  needs_review  waiting on a human decision
--   4  failed        needs a rescue
--   5  sent          history
--   6  rejected      history nobody wants
--
-- Recency uses `greatest(updated_at, created_at)` rather than the coalesce
-- chain, so touching any issue brings it to the top of its own group.
--
-- `status_filter` already existed and still works; the admin now passes it, so
-- "Drafts" is one click rather than a scroll.

create or replace function public.admin_list_newsletter_issues(
  status_filter text default null,
  limit_count integer default 100
)
returns setof watch_alley.newsletter_issues
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select *
    from watch_alley.newsletter_issues
    where status_filter is null or status = status_filter
    order by
      case status
        when 'sending' then 0
        when 'scheduled' then 1
        when 'draft' then 2
        when 'needs_review' then 3
        when 'failed' then 4
        when 'sent' then 5
        when 'rejected' then 6
        else 7
      end asc,
      greatest(coalesce(updated_at, created_at), created_at) desc
    limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$function$;

comment on function public.admin_list_newsletter_issues(text, integer) is
  'Newsletter issues for the admin panel, ordered by what needs attention (sending, scheduled, draft, needs_review, failed, sent, rejected) then newest first within each group.';

notify pgrst, 'reload schema';
