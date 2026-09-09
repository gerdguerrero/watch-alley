-- The Watch Alley: let the cron reclaim an interrupted newsletter send.
--
-- Problem this fixes
-- ------------------
-- `service_list_due_newsletter_issues` only ever returned issues at status
-- 'scheduled'. Any issue that entered 'sending' and did not reach the final
-- status update was stranded: the cron would never look at it again and only a
-- manual admin trigger could finish it.
--
-- That is not hypothetical. On 2026-07-03 and 2026-07-04 two issues died
-- mid-loop at exactly 60 recipients (a serverless timeout in the pre-batching
-- sender) and have sat at 'sending' ever since. The application now also
-- parks an issue at 'sending' deliberately when it reaches its daily send
-- budget, so without this change every budgeted send would strand itself on
-- the first run.
--
-- Why there is an upper bound as well as a lower one
-- --------------------------------------------------
-- A naive "reclaim anything stuck in sending" would have resumed those two
-- July issues on the next cron run and mailed a 68-day-old newsletter to the
-- 483 subscribers who joined after it was written. An interrupted send is
-- worth resuming for a few days; after that it is an abandoned draft and
-- finishing it is a human's decision, not a scheduler's.
--
--   lower bound  10 minutes  a run still in flight is not interrupted
--   upper bound  7 days      older than this is abandoned, not interrupted
--
-- Both bounds are deliberate. Widening the upper one will mail old news to
-- people who never asked for it.

create or replace function public.service_list_due_newsletter_issues(limit_count integer default 10)
returns setof watch_alley.newsletter_issues
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  return query
    select *
    from watch_alley.newsletter_issues
    where approved_at is not null
      and (
        -- Scheduled and due: unchanged behaviour.
        (status = 'scheduled' and scheduled_at is not null and scheduled_at <= now())
        -- Or interrupted recently enough to be worth resuming. The sender
        -- rebuilds its recipient list from the delivery log every run, so
        -- resuming re-sends to nobody who already received the issue.
        or (
          status = 'sending'
          and updated_at <= now() - interval '10 minutes'
          and updated_at >= now() - interval '7 days'
        )
      )
    order by coalesce(scheduled_at, updated_at) asc
    limit greatest(1, least(coalesce(limit_count, 10), 50));
end;
$function$;

comment on function public.service_list_due_newsletter_issues(integer) is
  'Newsletter issues the cron should send: scheduled and due, or interrupted between 10 minutes and 7 days ago. The upper bound stops an abandoned draft being mailed to a list that has since grown.';

notify pgrst, 'reload schema';
