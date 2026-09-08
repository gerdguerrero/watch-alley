# 0026 — Public view hardening (hotfix, applied 2026-09-08)

Migration: `supabase/migrations/20260908075742_watch_alley_public_view_hardening.sql`
Applied to `the-watch-alley` (`yrzawkqcifuubtltktbk`) at 2026-09-08 07:57 UTC through the Supabase MCP, ahead of this pull request, with Viron's explicit approval and after a full in-database snapshot (`backup_20260908`). This file carries the rationale, the verification record and the rollback.

## Why it was a hotfix

`public.watches` was recreated by migrations 0017 and 0019 (2026-05-24) without `security_invoker`, so it ran with its owner's privileges (`postgres`, which bypasses row security), was auto-updatable, and Supabase's default grants on the `public` schema left INSERT, UPDATE, DELETE and TRUNCATE on it for `anon` and `authenticated`. Anyone holding the publishable key that ships in every page could delete or reprice the whole inventory through PostgREST. Two independent reviews confirmed it the same day without executing anything.

## Pre-state (captured 2026-09-08 07:54 UTC)

- `pg_class.reloptions` for `public.watches`: `null`
- `information_schema.views`: `is_updatable = YES`, `is_insertable_into = YES`
- `role_table_grants`: `anon` and `authenticated` held `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` on every `public.*` table and view (10 objects)
- `EXPLAIN (costs off) DELETE FROM public.watches WHERE id = 'zzz'` as `anon` planned `Delete on watches → Index Scan … Filter: published` (no RLS qual)
- Policies `public_upsert` on `watch_page_views` and `anon_insert` on `visitor_ids` (INSERT, `with check (true)`, roles `anon, authenticated`)
- Function ACLs with a PUBLIC entry (`=X/postgres`): `service_get_profile_nudge_candidates`, `service_get_manual_profile_nudge_candidates`, `service_mark_profile_nudge_sent`, `service_unsubscribe_watch_list_subscriber(text, text)`, `admin_subscriber_metrics`; `authenticated` on `service_check_delivery_sent` and `service_log_delivery_event`
- Data: 370 watches, min price ₱4,800, no zero prices, 4 rows updated in the prior 24 h

## Post-state (verified 2026-09-08 07:58 UTC)

- `reloptions = {security_invoker=true}`
- No INSERT/UPDATE/DELETE/TRUNCATE grants to `anon`/`authenticated` on any `public.*` object
- Same `EXPLAIN` as `anon`: `ERROR 42501: permission denied for view watches`
- `SELECT count(*) FROM public.watches` as `anon`: 370, unpublished visible: 0; as `authenticated`: 370
- Both policies gone; every listed function now `service_role` only (`admin_subscriber_metrics` keeps `authenticated`, which the admin bridge needs; `admin_whoami` and `submit_inquiry` unchanged, see F17)
- Supabase security advisor: the `security_definer_view` ERROR is gone; remaining WARNs are the intentional admin RPCs and the anon-callable `admin_whoami` / `submit_inquiry`
- Live: `/`, `/available`, `/sold`, `/watch-list`, `/journal`, `/sitemap.xml`, `/w/twa-220`, a watch page and an `og-image` route all 200
- PostgREST with the publishable key: `GET /rest/v1/watches` 200 with rows; `DELETE` and `PATCH` on a non-existent id: 401 `permission denied for view watches`; `POST /rpc/service_get_manual_profile_nudge_candidates`: 401; `journal_posts` and `newsletter_issues` views still 200

## Rollback

Only if the storefront cannot read the public view and the cause is confirmed; this re-opens the anon write path.

```sql
begin;
alter view public.watches reset (security_invoker);
grant insert, update, delete, truncate, references, trigger on
  public.watches, public.journal_posts, public.newsletter_issues, public.newsletter_issue_items,
  public.watch_page_views, public.visitor_ids, public.visitor_countries,
  public.visitor_referrers, public.visitor_referrer_events, public.visitor_referrer_visitors
to anon, authenticated;
create policy "public_upsert" on public.watch_page_views for insert to anon, authenticated with check (true);
create policy "anon_insert" on public.visitor_ids for insert to anon, authenticated with check (true);
grant execute on function public.service_get_profile_nudge_candidates(int, int) to public, anon, authenticated;
grant execute on function public.service_get_manual_profile_nudge_candidates(text) to public, anon, authenticated;
grant execute on function public.service_mark_profile_nudge_sent(uuid) to public, anon, authenticated;
grant execute on function public.service_unsubscribe_watch_list_subscriber(text, text) to public, anon, authenticated;
grant execute on function public.admin_subscriber_metrics() to public, anon;
grant execute on function public.service_check_delivery_sent(uuid, text) to authenticated;
grant execute on function public.service_log_delivery_event(uuid, text, text, text, text, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
```

Data rollback, if a table were ever damaged: schema `backup_20260908` holds a full copy of every `watch_alley.*` and `public.*` table taken at 07:56 UTC the same day (27 tables, 13.8 MB, not visible to `anon`), and the Supabase Pro plan keeps seven daily backups (Dashboard → Database → Backups). Drop `backup_20260908` once this PR has been merged and verified for a week.

## Follow-ups queued (not in this migration)

- `alter default privileges … revoke execute on functions from public` so the next migration cannot repeat F3 (needs review of every future function grant).
- Soften `watch_alley.upsert_watch_list_subscriber` to null an invalid WhatsApp value instead of raising (the app can no longer send one after PR `fix/whatsapp-signup-normalisation`).
- Decide `submit_inquiry` (F17) and the anon SELECT policies on the analytics tables.
