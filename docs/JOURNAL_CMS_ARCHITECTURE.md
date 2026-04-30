# Journal CMS Architecture

The journal is a Supabase-backed CMS hosted as a static Vite site on Vercel.

## Current Contract

- Supabase is the source of truth for journal content.
- Admin writes go through authenticated RPCs: `admin_list_journal_posts`, `admin_upsert_journal_post`, and `admin_delete_journal_post`.
- Public reads go through the exposed `public.journal_posts` view.
- Row Level Security on `watch_alley.journal_posts` keeps drafts and scheduled posts private.
- `/journal` fetches published posts in the browser so newly published articles appear without a redeploy.
- `/journal/<slug>` is served by `journal-post.html` through the Vercel rewrite and fetches the matching published row live.
- `scripts/generate-journal-pages.mjs` rewrites the journal index at build time and emits a manifest for the sitemap. It is an SEO and first-paint snapshot, not the live source of truth.

## Recommended Operating Model

1. Keep `watch_alley` as the private application schema and expose only safe public views in `public`.
2. Keep direct table writes denied for `anon` and `authenticated`; admins should write through RPCs that call `watch_alley.is_admin()`.
3. Public pages should use the publishable key and query `public` views without an `Accept-Profile: watch_alley` header.
4. Use browser `cache: 'no-store'` for article reads where immediate editorial freshness matters.
5. Use a Vercel Deploy Hook after publish/delete when SEO snapshots, sitemap freshness, and unfurled social metadata need to update quickly.
6. Do not use Supabase Realtime for the public blog unless readers are expected to keep `/journal` open and see posts appear while the page is already loaded. For this site, live fetch on page load is enough.

## Why This Pattern

Supabase's REST Data API is generated from exposed schemas and honors Postgres RLS, so public views give the website a small, intentional read surface. Vercel Deploy Hooks are useful for CMS-style rebuilds, but the live public fetch means a post is readable immediately after publish even before the next deployment finishes.

## References

- Supabase Data REST API: https://supabase.com/docs/guides/api
- Supabase custom schemas: https://supabase.com/docs/guides/api/using-custom-schemas
- Supabase database changes / Realtime: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Vercel Deploy Hooks: https://vercel.com/docs/deploy-hooks
