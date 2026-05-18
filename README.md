# The Watch Alley

The Watch Alley is a curated watch commerce site for Filipino collectors. The
active deployable app is now the **Next.js App Router workspace in
[`next/`](./next/)**.

The repo previously shipped a Vite multi-page site from the repository root.
That stack has been retired from the active codebase. A small legacy bridge for
the operator admin and legal/trust static pages is copied into
[`next/public`](./next/public) so cutover to a Next.js Vercel project does not
break the owner workflow while the native App Router admin is rebuilt.

## Current Stack

| Layer | Choice |
|---|---|
| App framework | Next.js 16 App Router + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui, themed to The Watch Alley palette |
| Data | Supabase Postgres, Auth, Storage, Edge Functions, RLS, SECURITY DEFINER RPCs |
| Rendering | Server Components for public reads, ISR for watch and journal detail pages |
| Deployment | Vercel, with project root set to `next/` |

## Commands

From the repository root:

```bash
pnpm dev
pnpm build
pnpm check
pnpm test
```

These delegate into `next/`. You can also run commands directly there:

```bash
cd next
pnpm dev
pnpm build
pnpm exec biome check src
pnpm exec tsc --noEmit
```

## Vercel Cutover

In Vercel, set:

- **Root Directory:** `next`
- **Framework Preset:** Next.js
- **Build Command:** default (`next build`)
- **Install Command:** default pnpm install

The Next workspace includes [`next/vercel.json`](./next/vercel.json), which
keeps clean URLs and pins the framework preset for the cutover app.

## Route Status

Native App Router routes:

- `/`
- `/available`
- `/sold`
- `/journal`
- `/journal/[slug]`
- `/watch/[slug]`

Legacy bridge routes served from `next/public`:

- `/admin`
- `/privacy`
- `/terms`
- `/authenticity`

The bridge is intentional. The admin remains operator-critical, so it should be
ported to native Server Actions and shadcn/ui screens before the static bridge
is removed.

## Important Docs

- [Architecture](./docs/architecture.md)
- [Migration plan](./docs/migration-plan.md)
- [Roadmap](./docs/WATCH_ALLEY_ROADMAP.md)
- [Supabase setup](./docs/SUPABASE_SETUP.md)
- [Inventory schema](./docs/inventory-schema.md)

## Environment

Next.js env vars live in [`next/.env.example`](./next/.env.example). Required
for storefront builds:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Root `.env.local` is still read by `pnpm transcribe:feedback` for feedback video
transcription.
