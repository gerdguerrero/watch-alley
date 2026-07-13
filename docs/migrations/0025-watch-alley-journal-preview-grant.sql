-- Watch Alley journal draft preview grant (2026-07-13).
--
-- The signed draft-preview route (/journal/preview/<id>?token=…) reads any
-- post regardless of status with the service-role client through the
-- security_invoker view public.journal_posts. security_invoker means the
-- view runs with the CALLER's privileges, and service_role was never granted
-- SELECT on the underlying table (0013 only granted anon/authenticated).
-- Mirror of the service_role grant 0014 added for watch_alley.watches.
--
-- RLS does not gate service_role, so this grant is the only thing standing
-- between the preview route and drafts - which is exactly what it needs:
-- the route verifies an HMAC preview token before querying.
--
-- Idempotent. Safe to re-run.

grant select on watch_alley.journal_posts to service_role;
