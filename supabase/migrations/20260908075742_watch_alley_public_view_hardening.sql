-- The Watch Alley: public view hardening hotfix (2026-09-08)
--
-- Applied to production at 2026-09-08 07:57 UTC ahead of the pull request,
-- with explicit approval, after a full in-database snapshot (backup_20260908).
-- Rationale, verification record and rollback: docs/migrations/0026-watch-alley-public-view-hardening.md
--
-- F1  public.watches was recreated by 0017/0019 (2026-05-24) without
--     security_invoker, so it ran as its owner (postgres, bypassrls) and was
--     auto-updatable, while Supabase's default grants left INSERT/UPDATE/DELETE/
--     TRUNCATE on it for anon and authenticated. Verified 2026-09-08 with an
--     EXPLAIN as anon that planned a DELETE with only the view's own filter.
-- F15 Two client-beacon policies survived the move to service-role RPCs.
-- F3  Service functions created after 2026-06-20 were granted to service_role
--     without first revoking the default PUBLIC execute.
-- F24 Delivery-log helpers carry no internal role guard; service_role only.

-- F1: run the view as the caller so RLS on watch_alley.watches applies.
-- anon/authenticated keep SELECT on watch_alley.watches (granted in
-- 20260428032446) and the "Public read access" policy (published = true).
alter view public.watches set (security_invoker = true);

-- F1/F15: no write privileges on any public object for the public-facing roles.
-- Every write already goes through SECURITY DEFINER RPCs or the service role.
revoke insert, update, delete, truncate, references, trigger on
  public.watches,
  public.journal_posts,
  public.newsletter_issues,
  public.newsletter_issue_items,
  public.watch_page_views,
  public.visitor_ids,
  public.visitor_countries,
  public.visitor_referrers,
  public.visitor_referrer_events,
  public.visitor_referrer_visitors
from anon, authenticated;

-- F15: leftover client-beacon policies; writes go through service_record_watch_visit.
drop policy if exists "public_upsert" on public.watch_page_views;
drop policy if exists "anon_insert" on public.visitor_ids;

-- F3: service-only functions that default-grant left callable by everyone.
-- Each keeps its explicit service_role grant; the profile-nudge functions and the
-- unsubscribe function are called only from Next.js routes with the service key.
revoke execute on function public.service_get_profile_nudge_candidates(int, int)
  from public, anon, authenticated;
revoke execute on function public.service_get_manual_profile_nudge_candidates(text)
  from public, anon, authenticated;
revoke execute on function public.service_mark_profile_nudge_sent(uuid)
  from public, anon, authenticated;
revoke execute on function public.service_unsubscribe_watch_list_subscriber(text, text)
  from public, anon, authenticated;
-- admin_subscriber_metrics is called by the admin bridge with the user's JWT:
-- keep authenticated (guarded by is_admin() inside), drop PUBLIC and anon.
revoke execute on function public.admin_subscriber_metrics()
  from public, anon;

-- F24: delivery-log helpers are used only by lib/newsletter/send.ts via the
-- service role and have no internal guard.
revoke execute on function public.service_check_delivery_sent(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.service_log_delivery_event(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
