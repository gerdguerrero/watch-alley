# The Watch Alley Inventory Schema

Last updated: 2026-04-28

## Source of truth

**Supabase, schema `watch_alley`, table `watches`.**

The current Supabase project is the source of truth for both the admin dashboard and public storefront inventory. The admin page writes through allowlisted RPCs; the homepage reads the public `public.watches` view live and keeps `public/data/watches.json` only as a resilience fallback.

### Bootstrapping a new Supabase project

1. Create a new Supabase project under your own org.
2. Open the SQL editor and paste `docs/migrations/0001-watch-alley-bootstrap.sql`. It is idempotent — schema, table, RLS, view, allowlist, and admin RPCs all in one file.
3. Insert your admin email: `insert into watch_alley.admin_emails (email, note) values ('you@example.com', 'Owner');`
4. Copy your project's **URL** and **publishable anon key** into `.env.local` and into the placeholder constants near the top of `scripts/admin.js`.
5. Visit `/admin`, sign up, sign in, then add inventory rows.
6. Visit the homepage and confirm the carousel reads from the live `public.watches` view. Refresh `public/data/watches.json` only when you want to update the fallback snapshot.

## Live inventory workflow

```
Supabase watch_alley.watches
        │
        ▼ public.watches view + RLS public read
homepage carousel + sold archive + modal
        │
        ▼ fallback only if live read is unavailable
public/data/watches.json
```

To update inventory:

1. Sign in to `/admin` with an allowlisted account.
2. Save, delete, reserve, or mark listings sold through the dashboard.
3. The public website reads the updated inventory directly from Supabase.
4. Optional: run `pnpm sync:watches` when you deliberately want to refresh the static fallback snapshot.

The static JSON snapshot is no longer the publishing mechanism for normal inventory changes.

## Schemas exposed

- `watch_alley` is the real schema. RLS on. Public read allowed.
- `public.watches` is a `security_invoker` view that exposes the same rows to PostgREST (so the JS client / fetch can hit `/rest/v1/watches`). Reads are routed through the underlying table; the view never bypasses RLS.

## Table: `watch_alley.watches`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | Stable id (e.g. `twa-001`). "twa" = the-watch-alley. Kept as a text PK for backward compatibility with the historical JSON. |
| `slug` | text unique | URL-safe kebab-case. Powers `/#/watch/<slug>` deep links and Copy share link. |
| `brand` | text | Display brand (e.g. `SEIKO PROSPEX`). |
| `model` | text | Display model (e.g. `5 Sports SRPE81K1 "Snowflakes"`). |
| `reference` | text | Manufacturer reference number. |
| `name` | text | Card/modal display name. |
| `price` | int (PHP) | Asking price in pesos, integer. `>= 0`. |
| `currency` | text | Always `PHP` (constraint). |
| `status` | text | `available` / `reserved` / `sold` (constraint). |
| `condition_label` | text | E.g. `Pre-owned 8.5/10`. |
| `badge` | text | UI badge (e.g. `RARE`, `LIMITED`, `BRAND NEW`, `SOLD`). |
| `movement` | text | E.g. `6R35 automatic`. |
| `case_size` | text | E.g. `42 mm`. |
| `inclusion_set` | text | Mapped to JSON `set` (renamed because `set` is a SQL reserved word). |
| `material` | text | E.g. `Stainless steel`. |
| `edition` | text | E.g. `Limited to 2,020 pieces`. |
| `description` | text | Card description copy. |
| `disclosure` | text | Buyer-facing disclosure shown in the modal. |
| `primary_image` | text | Path under `/watch-assets/`. |
| `images` | text[] | Ordered list of image paths. Includes `primary_image`. Min length 1. |
| `inquiry_subject` | text | Pre-filled subject for `mailto:` inquiry. |
| `inquiry_body` | text | Pre-filled body for `mailto:` inquiry. |
| `sold_at` | text | YYYY-MM. **Required when `status = 'sold'`** (constraint). |
| `sold_price` | int (PHP) | Realized sale price. **Required when `status = 'sold'`**. Optional public surfacing. |
| `has_box` | bool | Optional. `true` = listing ships with original box. |
| `has_papers` | bool | Optional. `true` = listing ships with papers/warranty. |
| `service_history` | text | Optional one-line summary (e.g. `Serviced 2024`). |
| `featured` | bool | When true, eligible for featured carousel slot. Default false. |
| `low_stock` | bool | When true, surfaces a low-stock UI hint. Default false. |
| `display_order` | int | Lower number renders first in the active carousel. |
| `created_at` | timestamptz | Auto. |
| `updated_at` | timestamptz | Auto via trigger. |

## Constraints

- `price >= 0`.
- `currency = 'PHP'`.
- `status in ('available', 'reserved', 'sold')`.
- `images` array has at least one entry.
- `sold_at` matches `^[0-9]{4}-[0-9]{2}$` when not null.
- `sold_price >= 0` when not null.
- **Sold listings must have both `sold_at` and `sold_price`.**

## Indexes

- `(status, display_order)` — drives the carousel render path.
- `(sold_at desc)` — drives sold-archive ordering.

## Image conventions

Images live under `public/watch-assets/`. Every PNG/JPG has companion WebP variants generated by `pnpm optimize:images`:

- `name.png` → original PNG (kept as `<img>` fallback)
- `name-1600.webp` → 1600px-wide WebP (preferred for desktop hero)
- `name-800.webp` → 800px-wide WebP (preferred for cards / mobile)

When adding a new listing, drop the source PNG into `public/watch-assets/`, run `pnpm optimize:images`, and reference `/watch-assets/name.png` in `primary_image`/`images[]`. The homepage automatically swaps in the WebP variants via `<picture>` + srcset.

## Admin update workflow

Admin operations happen at `/admin` (Vercel serves it from the same site, mapped to `/admin/index.html`). The page is private:

1. **Authentication.** Supabase Auth with email + password. Sessions persisted in localStorage.
2. **Authorization.** Server-side allowlist in `watch_alley.admin_emails`. The browser never sees the list.
3. **Mutations.** All writes go through `SECURITY DEFINER` RPCs in the `public` schema:
   - `public.admin_whoami()` — returns `{ email, is_admin }` for UI gating. Anon-callable.
   - `public.admin_upsert_watch(payload jsonb)` — insert or update a row. Auto-generates `wa-###` id when absent.
   - `public.admin_delete_watch(watch_id text)` — hard delete by id.
   - `public.admin_mark_watch_sold(watch_id, sold_at_value, sold_price_value)` — atomically flip a row to `status = 'sold'` with the required fields.
4. **Authorization gate.** Every RPC begins with `if not watch_alley.is_admin() then raise 'Not authorized'`. The function is `SECURITY DEFINER` with a pinned empty `search_path` so it cannot be hijacked.
5. **Publish behavior.** Saving in `/admin` updates Supabase. The homepage reads the public `watches` view live, so normal inventory changes do not require a code deploy.

### Granting access

```sql
insert into watch_alley.admin_emails (email, note) values
  ('your-email@example.com', 'Owner');
```

### Future hardening (not yet done)

- Rate-limit RPCs at the Postgres level once the page is exposed publicly.
- Add an `admin_audit_log` table that records every upsert/delete/sold flip with the caller's email + timestamp + before/after JSON.
- Move from passwords to magic-link or SSO once the volume of admins grows.

## Listing QA checklist

Before marking a watch row visible:

- [ ] `slug` is URL-safe kebab-case and globally unique.
- [ ] `brand`, `model`, `reference`, `name` filled, no placeholder text.
- [ ] `price` is the actual asking price in PHP integer pesos.
- [ ] `condition_label` matches the daylight photos.
- [ ] `disclosure` honestly states polished/replaced/serviced status (per the Authenticity page).
- [ ] `set`, `material`, `movement`, `case_size`, `edition` filled.
- [ ] `primary_image` exists in `public/watch-assets/`, WebP variants exist, image looks right at card and modal sizes.
- [ ] At least one alt image in `images[]` for buyer trust.
- [ ] `inquiry_subject` and `inquiry_body` mention the brand, model, and price.
- [ ] If sold, `sold_at` and `sold_price` are filled and `badge = 'SOLD'`.
- [ ] `display_order` set so featured pieces lead.

## Why live fetch instead of JSON-first publishing

We considered three migration strategies:

- A. Supabase source of truth, JSON snapshot for reads.
- B. Supabase source of truth, live fetch in browser.
- C. Both — live fetch first, static snapshot fallback.

Option C is now the operating model because:

1. Owners can save inventory from `/admin` without touching terminal, Git, JSON, or deploy steps.
2. Supabase remains the single source of truth.
3. The public `watches` view exposes only buyer-facing inventory fields.
4. `public/data/watches.json` remains a safe fallback if the live read is temporarily unavailable.

The homepage should not regress to JSON-first publishing unless there is an explicit operational incident and rollback decision.

## Future migrations

- Add a `brands` lookup table once brand-page Phase 2 work begins.
- Move images to Supabase Storage when total payload outgrows the 21 MB current footprint.
- Introduce a `lead_inquiries` table for Phase 3 lead CRM.
- Introduce a `consignment_submissions` table for Phase 5 consignment workflow.
