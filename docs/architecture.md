# The Watch Alley — Architecture

> **Status:** Deployment migration complete in the codebase. The active app is
> the Next.js workspace in [`next/`](../next/). Vercel must use `next/` as the
> project root so the deployment framework is detected as Next.js.

The old Vite storefront has been removed from the active root. A small static
legacy bridge remains inside [`next/public`](../next/public) for `/admin` and
the legal/trust pages until those surfaces are rebuilt as native App Router
routes.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 App Router** | Server Components, ISR, metadata, and Vercel-native routing fit the storefront better than generated static HTML. |
| Language | **TypeScript strict** | Safer refactors across inventory, journal, and admin actions. |
| Styling | **Tailwind CSS v4 + shadcn/ui** | CSS-first tokens preserve the Watch Alley visual system while shadcn supplies accessible primitives for future admin screens. |
| Data | **Supabase** | Existing source of truth for inventory, journal content, inquiries, admin allowlist, and storage. |
| Public reads | **Cookie-free server anon client** | Build-safe reads for `generateStaticParams`, metadata, and ISR while RLS still protects unpublished data. |
| Auth/admin reads | **`@supabase/ssr` cookie-aware client** | Reserved for authenticated Server Actions, route handlers, and the future native admin. |
| Writes | **Server Actions** | Target architecture for inquiry/admin mutations. The legacy admin bridge still uses existing SECURITY DEFINER RPCs client-side. |
| Images | **`next/image`** | Optimized remote Supabase images plus static local bridge assets. |
| Validation | **Biome + TypeScript + production build** | Lightweight default verification. Browser smoke checks are risk-based, not mandatory for every slice. |
| Hosting | **Vercel** | Root directory should be `next/`; framework preset should be Next.js. |

## Active Layout

```text
watch-alley/
├── next/                         # Active deployable app
│   ├── src/
│   │   ├── app/                  # App Router storefront routes
│   │   │   ├── page.tsx          # /
│   │   │   ├── available/
│   │   │   ├── sold/
│   │   │   ├── journal/
│   │   │   └── watch/[slug]/
│   │   ├── components/
│   │   │   ├── storefront/
│   │   │   └── ui/
│   │   └── lib/
│   │       ├── supabase/         # public, server, browser, admin clients
│   │       ├── inventory/
│   │       ├── journal/
│   │       └── fx/
│   ├── public/                   # Static bridge assets + local images
│   │   ├── admin/index.html      # Legacy admin bridge
│   │   ├── scripts/admin.js
│   │   ├── styles/
│   │   ├── watch-assets/
│   │   ├── og/
│   │   ├── privacy.html
│   │   ├── terms.html
│   │   └── authenticity.html
│   ├── scripts/
│   │   └── transcribe-feedback.mjs
│   ├── next.config.ts
│   ├── vercel.json
│   └── package.json
├── docs/
│   ├── migrations/               # Supabase SQL migrations
│   ├── migration-plan.md
│   └── WATCH_ALLEY_ROADMAP.md
├── feedback/
└── package.json                  # Root command delegates into next/
```

## Public Storefront Flow

```text
Request /, /available, /sold, /journal, /watch/<slug>
        │
        ▼
Next.js Server Component / metadata / generateStaticParams
        │
        ▼
createSupabasePublicClient()
        │
        ▼
Supabase public views/tables with RLS
        │
        ▼
Static HTML + ISR, revalidate: 60
```

Public storefront queries must stay cookie-free unless a route truly needs
personalized data. Calling `cookies()` inside static params or prerender paths
will break `next build`.

## Legacy Bridge

The static bridge preserves owner/admin continuity during cutover:

- `/admin` rewrites to `/admin/index.html`
- `/privacy` rewrites to `/privacy.html`
- `/terms` rewrites to `/terms.html`
- `/authenticity` rewrites to `/authenticity.html`

The admin bridge still calls existing Supabase RPCs:

- `admin_whoami`
- `admin_list_watches`
- `admin_upsert_watch`
- `admin_delete_watch`
- `admin_mark_watch_sold`
- `admin_list_inquiries`
- `admin_update_inquiry_status`
- `admin_dashboard_metrics`
- journal and social draft admin RPCs

This is acceptable for cutover because it preserves the current verified
operator workflow. The next architecture milestone is replacing the bridge with
native App Router admin pages, `proxy.ts` auth gating, and Server Actions.

## Verification

Default local verification:

```bash
pnpm check
pnpm build
```

From `next/`, the equivalent is:

```bash
pnpm exec biome check src
pnpm exec tsc --noEmit
pnpm build
```

Run browser smoke checks only for changes that materially affect layout,
interaction, routing, or deployment cutover behavior.
