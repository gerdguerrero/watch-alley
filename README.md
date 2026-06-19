# The Watch Alley

The Watch Alley is a curated watch commerce site for Filipino collectors.
The repo is a single Next.js App Router workspace deployed to Vercel.

🔐 **Admin**: `/admin` is gated by edge middleware — requires `?token=` URL param.

## Current Stack

| Layer | Choice |
|---|---|
| App framework | Next.js 16 App Router + React 19 + Turbopack |
| Styling | Tailwind CSS v4 + shadcn/ui, themed to The Watch Alley palette |
| Data | Supabase Postgres, Auth, Storage, Edge Functions, RLS, SECURITY DEFINER RPCs |
| Rendering | Server Components for public reads, ISR for watch and journal detail pages |
| Hosting | Vercel |

## Commands

```bash
pnpm dev          # Turbopack dev server on http://localhost:3000
pnpm build        # Production build
pnpm start        # Serve the production build
pnpm check        # Biome + tsc --noEmit
pnpm test         # check && build
```

## Vercel deployment

Vercel auto-detects the Next.js framework from `package.json` at the repo
root. No special root-directory override is needed. The repo's
[vercel.json](./vercel.json) pins clean URLs and the framework preset.

Required environment variables (set in Vercel **Settings → Environment
Variables** for both Preview and Production):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WATCH_LIST_IP_HASH_SALT= # optional, used to hash consent/request IP metadata
```

For local development, copy [.env.example](./.env.example) to `.env.local`
and fill in the values.

## Routes

Native App Router:

- `/` — homepage
- `/available` — full grid of available pieces
- `/sold` — sold archive (ledger)
- `/journal` — journal index
- `/journal/[slug]` — journal post (ISR)
- `/watch/[slug]` — watch detail (ISR, per-watch OG + JSON-LD)
- `/watch-list` — The Watch List signup and sourcing request page

API route handlers:

- `POST /api/watch-list/signup` — newsletter/list signup with preferences
- `POST /api/watch-list/alert` — sold-watch/similar-piece alert
- `POST /api/watch-list/sourcing` — structured sourcing request

Legacy bridge routes served as static HTML under [public/](./public):

- `/admin` — operator dashboard (to be ported to native Server Actions)
- `/privacy`, `/terms`, `/authenticity` — legal/trust pages

The bridge stays in place until each surface is rebuilt natively.

## Key docs

- [Architecture](./docs/architecture.md) — stack rationale, file layout, design tokens
- [CLAUDE.md](./CLAUDE.md) — coding agent conventions for this repo
- [Migration history](./docs/migration-plan.md) — Vite → Next.js timeline (archived)
- [Roadmap](./docs/WATCH_ALLEY_ROADMAP.md)
- [Supabase setup](./docs/SUPABASE_SETUP.md)
- [Inventory schema](./docs/inventory-schema.md)
- [The Watch List handover](./docs/watch-list/README.md)

## One-off scripts

- `pnpm transcribe:feedback` — runs [scripts/transcribe-feedback.mjs](./scripts/transcribe-feedback.mjs) to transcribe client feedback videos (Whisper) and extract structured action items (Claude). Requires `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in `.env.local`. Not used at runtime.
