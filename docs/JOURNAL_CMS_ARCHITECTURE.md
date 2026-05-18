# Journal CMS Architecture

The journal is a Supabase-backed CMS rendered by the Next.js App Router on
Vercel.

## Current Contract

- Supabase is the source of truth for journal content.
- Admin writes go through authenticated RPCs: `admin_list_journal_posts`, `admin_upsert_journal_post`, and `admin_delete_journal_post`.
- Public reads go through the exposed `public.journal_posts` table/view surface with RLS.
- Row Level Security on `watch_alley.journal_posts` keeps drafts and scheduled posts private.
- `/journal` is a Server Component and renders published posts from Supabase.
- `/journal/<slug>` is an ISR page with `revalidate = 60`, `generateStaticParams`, metadata, and Article JSON-LD.
- The old `scripts/generate-journal-pages.mjs` static pipeline has been retired.

## Recommended Operating Model

1. Keep `watch_alley` as the private application schema and expose only safe public views in `public`.
2. Keep direct table writes denied for `anon` and `authenticated`; admins should write through RPCs that call `watch_alley.is_admin()`.
3. Public pages should use the publishable key and query `public` views without an `Accept-Profile: watch_alley` header.
4. Keep public journal reads cookie-free and build-safe so `generateStaticParams`, metadata, and ISR can run without a request context.
5. Use `revalidatePath('/journal')` and `revalidatePath('/journal/<slug>')` once the native admin is ported to Server Actions.
6. Do not use Supabase Realtime for the public blog unless readers are expected to keep `/journal` open and see posts appear while the page is already loaded. For this site, ISR/live server render on page load is enough.

## Why This Pattern

Supabase's REST Data API is generated from exposed schemas and honors Postgres RLS, so public views give the website a small, intentional read surface. ISR gives the site SEO-ready HTML and social metadata without keeping a bespoke static page generator.

## References

- Supabase Data REST API: https://supabase.com/docs/guides/api
- Supabase custom schemas: https://supabase.com/docs/guides/api/using-custom-schemas
- Supabase database changes / Realtime: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Vercel Deploy Hooks: https://vercel.com/docs/deploy-hooks
