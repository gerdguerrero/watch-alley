# Next.js workspace — agent conventions

This is the active Next.js app for **The Watch Alley** (cut over from Vite — see
[../docs/architecture.md](../docs/architecture.md) for stack rationale and
[../docs/migration-plan.md](../docs/migration-plan.md) for phase status).

Before writing any framework-level code, **read the relevant guide under
[node_modules/next/dist/docs/](./node_modules/next/dist/docs/)**. Next.js 16 has
breaking changes — `proxy.ts` instead of `middleware.ts`, Cache Components,
`unstable_instant`, etc. Heed deprecation notices.

---

## Stack at a glance

- **Next.js 16** App Router + Turbopack + React 19
- **TypeScript strict**
- **Tailwind CSS v4** (`@theme inline` in [src/app/globals.css](./src/app/globals.css))
- **shadcn/ui** heavily themed to the WA palette; `new-york` style
- **Supabase** via `@supabase/ssr` (Server Components / Server Actions) and
  `@supabase/supabase-js` with `server-only` for the admin client
- **Biome** for lint + format
- **Biome** + **TypeScript** + `next build` are the default quality gates

## File layout

```
src/
├── app/                     # App Router
│   ├── page.tsx             # /
│   ├── available/           # /available
│   ├── sold/                # /sold
│   ├── journal/             # /journal and /journal/[slug]
│   ├── watch/[slug]/        # /watch/<slug>
│   ├── admin/               # Future native admin; current admin is public/admin bridge
│   └── api/                 # Webhooks ONLY — prefer Server Actions
├── components/
│   ├── ui/                  # shadcn primitives (do not hand-edit unless re-running `shadcn add`)
│   ├── storefront/          # Public-facing components
│   └── admin/               # Admin shell + forms
├── lib/
│   ├── supabase/            # public.ts, server.ts, client.ts, admin.ts
│   ├── inventory/           # Domain: types, normalize, queries, format
│   ├── journal/             # Domain: types, normalize, queries, renderMarkdown
│   ├── fx/                  # PHP → USD helper
│   └── schema/              # Zod schemas, one per Server Action boundary
```

## Server / Client component boundary

**Default to Server.** Make a component a Client Component only if it needs:

1. Event handlers (`onClick`, `onSubmit` with client logic)
2. State or refs (`useState`, `useRef`)
3. Browser APIs (`window`, `localStorage`, `IntersectionObserver`)
4. Effects (`useEffect`)

If none apply, it stays a Server Component — even with props, even inside a
Client Component. Push the `"use client"` boundary as far down the tree as it
will go. The arrivals carousel is a Server Component; only its arrow controls
are a tiny Client Component island.

## Supabase patterns

| Need | Use | Why |
|---|---|---|
| Public read in Server Component / metadata / `generateStaticParams` | `createSupabasePublicClient()` from `@/lib/supabase/public` | Cookie-free, build-safe, RLS-gated by anon key |
| Authenticated read in a Server Action / route handler | `createSupabaseServerClient()` from `@/lib/supabase/server` | Reads + refreshes the session from cookies |
| Read in a Client Component | `createSupabaseBrowserClient()` from `@/lib/supabase/client` | Only when realtime or progress events are essential |
| Admin write that must bypass RLS | `createSupabaseAdminClient()` from `@/lib/supabase/admin` | `import "server-only"` makes accidental client import a build error |

Service-role usage is rare. Always check authorization before bypassing RLS.

## Inventory domain

The Supabase `public.watches` row shape is **never** consumed directly. Always
go through:

1. `fetchWatches()` / `fetchFeaturedWatch()` in [lib/inventory/queries.ts](./src/lib/inventory/queries.ts)
2. `normalizeWatchRow()` in [lib/inventory/normalize.ts](./src/lib/inventory/normalize.ts) (called inside queries)
3. The `Watch` type in [lib/inventory/types.ts](./src/lib/inventory/types.ts)

Display helpers (`formatPhp`, `formatWatchMeta`, `badgeIsBrandNew`) live in
[lib/inventory/format.ts](./src/lib/inventory/format.ts) — pure functions, safe
to import from both Server and Client Components.

## Theming + design tokens

All visual tokens live in [src/app/globals.css](./src/app/globals.css) inside a
single `@theme inline` block. Token names preserve the old Watch Alley design
vocabulary (`--color-navy-deep`, `--color-gold`, …).

shadcn semantic tokens (`--primary`, `--background`, `--card`, …) are **mapped**
to the WA palette in `:root`. The site is always dark — no `.dark` class
variant. `color-scheme: dark` tells the browser to render form controls and
scrollbars accordingly.

**Font names in `@theme inline` are literal strings, not `var()` references.**
Tailwind v4 resolves `@theme inline` at parse time, before `next/font` injects
its runtime CSS variables. The `next/font` Petrona/Spectral/JetBrains_Mono
imports in [src/app/layout.tsx](./src/app/layout.tsx) register `@font-face`
under those canonical family names, which the theme block references.

## Performance rules (must follow)

Source: [Vercel React Best Practices](https://vercel.com/docs) (priority order):

1. **Eliminate waterfalls.** Inside one component, run independent fetches with
   `Promise.all`. Across components, restructure so parent fetches once and
   passes data down.
2. **Bundle size.** No barrel imports from large libraries. Use `next/dynamic`
   for heavy client-only widgets. Defer analytics until after hydration.
3. **Server-side caching.** For data used in multiple places per request,
   wrap the function with `React.cache()`. For cross-request, use an LRU.
4. **Minimize serialization.** Don't pass massive objects from Server to
   Client Components — pick only the fields the client needs.
5. **No re-renders for refs.** Transient values that don't drive UI go in
   refs, not state.
6. **Hoist static JSX.** Pure-static markup blocks belong at module scope.

## Commands

```bash
pnpm dev          # Turbopack dev server on http://localhost:3000
pnpm build        # Production build (Turbopack)
pnpm start        # Serve the production build
pnpm run check                       # Biome + TypeScript
pnpm exec biome check --write src    # Lint + format and apply safe fixes
pnpm exec tsc --noEmit               # Type check
```

## Anti-patterns (don't do this)

- `'use client'` at the page level "to make it work" — find the real reason
  the component fails and isolate it.
- Importing `@/lib/supabase/admin` anywhere outside a Server Action.
- Editing `src/components/ui/*` by hand — rerun `shadcn add` with `--overwrite`
  and customize via Tailwind classes / variants.
- `import * as X from 'big-library'` — use named imports only.
- New global CSS rules — extend `@theme inline` instead.
- Light-mode color variants — the site is always dark.
- `export const dynamic = 'force-dynamic'` to "fix" caching issues — instead,
  add `cache: 'no-store'` to the specific fetch, or move to a Server Action.

## Legacy bridge

The old Vite root has been removed. The current `/admin`, `/privacy`, `/terms`,
and `/authenticity` surfaces are static bridge files under `public/`, with
rewrites in `next.config.ts`. Do not delete that bridge until native App Router
admin and legal/trust pages are implemented and verified.
