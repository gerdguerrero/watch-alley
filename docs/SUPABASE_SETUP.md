# The Watch Alley × Supabase — Setup Status (2026-04-28)

## Project

- Supabase project: **the-watch-alley**
- Project ref: `yrzawkqcifuubtltktbk`
- API URL: https://yrzawkqcifuubtltktbk.supabase.co
- Publishable anon key: used by the public front-end for read-only inventory access. Keep the actual value in the client/runtime config, not in this status note.

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
| 20260428032938    | watch_alley_id_prefix_twa              | Changed ID prefix from wa- to twa-, updated admin_upsert_watch with auto-ID generation. |
| 20260428034843    | watch_alley_admin_allowlist_rpcs       | Admin email management RPCs. |
| 20260428050925    | watch_alley_revoke_anon_admin_inquiry_rpcs | Revoked anon EXECUTE on admin/inquiry RPCs. |
| 20260428082611    | watch_alley_social_publishing_drafts    | Social publishing drafts table + RPCs. |
| 20260428153233    | watch_alley_provenance_v2              | Provenance column + updated admin_upsert_watch. |
| 20260428155134    | watch_alley_inquiry_notifications       | Notification log + notification RPCs. |
| 20260428160037    | watch_alley_inquiry_lost_reason        | Lost reason support in inquiry status workflow. |
| 20260428164348    | watch_alley_journal                    | Journal posts table + admin RPCs. |
| 20260428225031    | watch_alley_published_state            | Published boolean + draft support. Updated admin_upsert_watch. |
| 20260428225443    | watch_alley_admin_list_watches         | admin_list_watches RPC (bypasses draft RLS). |
| 20260428230110    | watch_alley_admin_dashboard            | Dashboard metrics RPC. |
| 20260524143033    | 0017-watch-alley-category              | Added category column, backfilled data, updated public.watches view. |
| 20260524143247    | 0018-watch-alley-category-upsert       | Updated admin_upsert_watch to persist category + badges JSONB. (Applied directly, no repo file.) |
| 20260524144801    | 0019-watch-alley-badges               | Added badges JSONB column, migrated limited-edition category to badges, updated public.watches view. |
| 20260525120000    | 0020-watch-alley-admin-upsert-full     | Restored auto-ID generation (twa-NNN) lost in 0018. Full admin_upsert_watch with category, badges, auto-ID. |
| 20260619212408    | watch_alley_watch_list_pipeline        | The Watch List subscriber, preference, sold-watch alert, and sourcing-request tables plus service-role-only submit RPCs. |

13 watches seeded from the legacy JSON snapshot now carried at `next/public/data/watches.json` (10 available + 3 sold archive).

## SQL artifacts in this folder (in order)

| file                                                  | purpose |
| ----------------------------------------------------- | ------- |
| 0001-watch-alley-bootstrap.sql                        | Original idempotent bootstrap. Now applied. |
| 0002-watch-alley-seed.sql                             | Initial inventory seed (regenerated from current JSON). |
| 0003-watch-alley-admin-rpc-hardening.sql              | Anon revokes + explicit admin_emails deny-all. |
| 0004-watch-alley-inquiries-pipeline.sql               | Buyer inquiry pipeline + admin RPCs + metrics. |
| 0005-watch-alley-storage.sql                          | watches storage bucket + admin write policies. |
| 0020-watch-alley-admin-upsert-full.sql                | Full admin_upsert_watch: category + badges + auto-ID. |
| 0023-watch-alley-draft-listings-without-photos.sql    | Allows draft inventory rows to save without photos while published listings still require at least one photo. |
| supabase/migrations/20260619212408_watch_alley_watch_list_pipeline.sql | The Watch List collector pipeline schema + submit RPCs. |

These are kept as the canonical migration history. If you wipe/recreate the
project, run them in numeric order.

## What Buloy still needs to do manually (one-time)

1. **Create your admin Supabase Auth account.**
   - Open https://supabase.com/dashboard/project/yrzawkqcifuubtltktbk/auth/users
   - Click **Add user → Send invitation** (or **Create new user** with a
     password) for the email you want to log into `/admin` with.
   - Email confirmation is on by default; check your inbox and confirm.

2. **Add yourself to the admin allowlist.**
   In SQL editor, run:
   ```sql
   insert into watch_alley.admin_emails (email, note)
   values (lower('your.email@example.com'), 'Buloy — primary admin')
   on conflict (email) do nothing;
   ```
   The `is_admin()` function is case-insensitive on the email lookup.

3. **(Optional) Verify auth flow** by opening `/admin` locally via the Next dev
   server, signing in with that account, and confirming the workspace
   panel renders (not the "Forbidden" panel).

## Front-end inventory path

- Public storefront read path: Next Server Components call Supabase from
  `next/src/lib/inventory/queries.ts` through the cookie-free public client.
- Inventory sync (JSON snapshot): update `next/public/data/watches.json` only
  when you intentionally want to refresh the legacy bridge fallback.
- Admin writes: only via RPC names below.

## The Watch List deployment notes

- Apply `supabase/migrations/20260619212408_watch_alley_watch_list_pipeline.sql`
  before deploying the `/watch-list` UI and API routes.
- The Next route handlers use `SUPABASE_SERVICE_ROLE_KEY` server-side to call
  service-role-only RPCs. Do not expose that key as a `NEXT_PUBLIC_*` variable.
- Optional `WATCH_LIST_IP_HASH_SALT` can be set in Vercel to stabilize consent
  IP hashes without storing raw IP addresses. If unset, the server falls back
  to existing private runtime secrets.
- Vercel Web Analytics is already mounted in `src/app/layout.tsx`; signup,
  alert, and sourcing form components emit custom events after successful
  writes.

## RPC reference

| RPC                                | callable as     | what it does |
| ---------------------------------- | --------------- | ------------ |
| `submit_inquiry(payload)`          | anon            | Insert a buyer inquiry. payload keys: `name`, `email`, `phone`, `channel`, `message`, `watchSlug` or `watchId`, `source`. |
| `admin_whoami()`                   | anon, authed    | Returns `{email, is_admin}`. Used by `/admin` to gate UI. |
| `admin_upsert_watch(payload)`      | authed + admin  | Insert or update a watch row. Validates category, normalizes badges, auto-assigns `twa-NNN` ID if missing. |
| `admin_delete_watch(watch_id)`     | authed + admin  | Delete a watch. |
| `admin_mark_watch_sold(id,sold_at,sold_price)` | authed + admin | Move a watch to sold archive. |
| `admin_list_inquiries(status, limit, offset)`  | authed + admin | Paginated, status-filtered inquiry list. |
| `admin_update_inquiry_status(id,status,note)`  | authed + admin | Move inquiry through workflow. Also stamps responded_at / closed_at. |
| `admin_inquiry_metrics()`          | authed + admin  | Totals + per-watch top 20 over 90 days. The "one metric" hinge. |
| `submit_watch_list_signup(payload)` | service_role | Insert/update a Watch List subscriber and preferences. Called by `/api/watch-list/signup`. |
| `submit_watch_list_alert(payload)` | service_role | Store a sold-watch/similar-piece alert with watch context. Called by `/api/watch-list/alert`. |
| `submit_sourcing_request(payload)` | service_role | Store a structured sourcing request. Called by `/api/watch-list/sourcing`. |

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

Levers 1 (inventory in Supabase) and 2 (inquiry pipeline) from The Watch
Alley strategic roadmap are now both **substrate-ready**. Phase 2 features
(filter / search / brand chips) can now be built once against this
substrate — no need to rebuild against a different data layer in 60 days.

Next priorities (per the watch-alley-development skill roadmap):

1. Replace the static `/admin` bridge with native App Router admin pages and
   Server Actions.
2. Build the public inquiry form on each watch detail page that calls
   `submit_inquiry` instead of `mailto:`. Keep the existing mailto as a
   graceful fallback for first 30 days while inquiry funnel is tuned.
3. Build admin inbox UI on top of `admin_list_inquiries` +
   `admin_update_inquiry_status`. Show `admin_inquiry_metrics()` as the
   dashboard top tile — this is the conversion hinge metric.
4. Replace local `next/public/watch-assets/*.png` with bucket URLs once admin
   upload flow is wired (`/storage/v1/object/public/watches/<key>`).
