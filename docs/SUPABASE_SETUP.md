# Watch Alley × Supabase — Setup Status (2026-04-28)

## Project

- Supabase project: **the-watch-alley**
- Project ref: `yrzawkqcifuubtltktbk`
- API URL: https://yrzawkqcifuubtltktbk.supabase.co
- Anon publishable key (safe to ship in admin.html / front-end):
  `sb_publishable_OU38evYLP4E6Kl6TiByOqA_7l-mrxzY`

## What's already deployed (via Supabase MCP)

Migrations applied to production:

| version           | name                                  | what it does |
| ----------------- | ------------------------------------- | ------------ |
| 20260428032446    | watch_alley_bootstrap                 | Schema, watches table, indexes, updated_at trigger, RLS, public.watches view, public read policy. |
| 20260428032514    | watch_alley_admin_rpcs                | admin_emails allowlist, watch_alley.is_admin(), admin_whoami / admin_upsert_watch / admin_delete_watch / admin_mark_watch_sold RPCs. |
| 20260428032756    | watch_alley_admin_rpc_hardening       | Revoke EXECUTE on write RPCs from anon; explicit deny-all RLS policy on admin_emails. |
| 20260428032830    | watch_alley_inquiries_pipeline        | inquiries table + status workflow (new → contacted → viewing → reserved → sold/lost), submit_inquiry / admin_list_inquiries / admin_update_inquiry_status / admin_inquiry_metrics RPCs. |
| 20260428032849    | watch_alley_storage_policies          | (superseded by 0005-storage-policies in this folder.) |
| —                 | (post-deployment) bucket listing fix  | Removed public-listing storage policy. |

13 watches seeded from `public/data/watches.json` (10 available + 3 sold archive).

## SQL artifacts in this folder (in order)

| file                                                  | purpose |
| ----------------------------------------------------- | ------- |
| 0001-watch-alley-bootstrap.sql                        | Original idempotent bootstrap. Now applied. |
| 0002-watch-alley-seed.sql                             | Initial inventory seed (regenerated from current JSON). |
| 0003-watch-alley-admin-rpc-hardening.sql              | Anon revokes + explicit admin_emails deny-all. |
| 0004-watch-alley-inquiries-pipeline.sql               | Buyer inquiry pipeline + admin RPCs + metrics. |
| 0005-watch-alley-storage.sql                          | watches storage bucket + admin write policies. |

These are kept as the canonical migration history. If you wipe/recreate the
project, run them in numeric order.

## What Buloy still needs to do manually (one-time)

1. **Create your admin Supabase Auth account.**
   - Open https://supabase.com/dashboard/project/yrzawkqcifuubtltktbk/auth/users
   - Click **Add user → Send invitation** (or **Create new user** with a
     password) for the email you want to log into admin.html with.
   - Email confirmation is on by default; check your inbox and confirm.

2. **Add yourself to the admin allowlist.**
   In SQL editor, run:
   ```sql
   insert into watch_alley.admin_emails (email, note)
   values (lower('your.email@example.com'), 'Buloy — primary admin')
   on conflict (email) do nothing;
   ```
   The `is_admin()` function is case-insensitive on the email lookup.

3. **(Optional) Verify auth flow** by opening `admin.html` locally via
   `pnpm dev`, signing in with that account, and confirming the workspace
   panel renders (not the "Forbidden" panel).

## Where to wire the front-end

- Public storefront read path: `/rest/v1/watches?select=...&order=display_order.asc`
  (the `public.watches` view, not the schema-qualified table).
- Inventory sync (JSON snapshot): run
  `node scripts/sync-watches-from-supabase.mjs --service-role` whenever you
  want to refresh `public/data/watches.json` from the database.
- Admin writes: only via RPC names below.

## RPC reference

| RPC                                | callable as     | what it does |
| ---------------------------------- | --------------- | ------------ |
| `submit_inquiry(payload)`          | anon            | Insert a buyer inquiry. payload keys: `name`, `email`, `phone`, `channel`, `message`, `watchSlug` or `watchId`, `source`. |
| `admin_whoami()`                   | anon, authed    | Returns `{email, is_admin}`. Used by admin.html to gate UI. |
| `admin_upsert_watch(payload)`      | authed + admin  | Insert or update a watch row. Auto-assigns `wa-NNN` ID if missing. |
| `admin_delete_watch(watch_id)`     | authed + admin  | Delete a watch. |
| `admin_mark_watch_sold(id,sold_at,sold_price)` | authed + admin | Move a watch to sold archive. |
| `admin_list_inquiries(status, limit, offset)`  | authed + admin | Paginated, status-filtered inquiry list. |
| `admin_update_inquiry_status(id,status,note)`  | authed + admin | Move inquiry through workflow. Also stamps responded_at / closed_at. |
| `admin_inquiry_metrics()`          | authed + admin  | Totals + per-watch top 20 over 90 days. The "one metric" hinge. |

All admin_* RPCs check `watch_alley.is_admin()` internally and raise
`42501 Not authorized` if the caller's email is not on the allowlist.

## Storage bucket

- Bucket: `watches` (public).
- Public read works via direct URL — no listing policy by design.
- Admin writes (insert / update / delete) gated by `watch_alley.is_admin()`.
- Allowed mime: jpeg, png, webp, avif. Max 10 MB per file.

## Advisor warnings still on file (acceptable)

- `submit_inquiry` callable by anon: **intentional** — public inquiry form needs it.
- `admin_whoami` callable by anon: **intentional** — admin.html needs to know you're not an admin before you sign in.
- All other admin_* RPCs callable by `authenticated`: **intentional** — `is_admin()` is the real gate, baked into each function.
- `rls_auto_enable`: Supabase platform internal, not project code.

## TypeScript types

Generated to `types/supabase.ts`. Regenerate after any schema change with:

```bash
# via Supabase CLI
pnpm dlx supabase gen types typescript --project-id yrzawkqcifuubtltktbk > types/supabase.ts

# or via Hermes Supabase MCP → generate_typescript_types
```

## Strategic position

Levers 1 (inventory in Supabase) and 2 (inquiry pipeline) from the Watch
Alley strategic roadmap are now both **substrate-ready**. Phase 2 features
(filter / search / brand chips) can now be built once against this
substrate — no need to rebuild against a different data layer in 60 days.

Next priorities (per the watch-alley-development skill roadmap):

1. Wire `admin.html` upsert flow against these RPCs (already partially in
   place — verify after creating the auth account in step 1 above).
2. Build the public inquiry form on each watch's modal that calls
   `submit_inquiry` instead of `mailto:`. Keep the existing mailto as a
   graceful fallback for first 30 days while inquiry funnel is tuned.
3. Build admin inbox UI on top of `admin_list_inquiries` +
   `admin_update_inquiry_status`. Show `admin_inquiry_metrics()` as the
   dashboard top tile — this is the conversion hinge metric.
4. Replace local `public/watch-assets/*.png` with bucket URLs once admin
   upload flow is wired (`/storage/v1/object/public/watches/<key>`).
