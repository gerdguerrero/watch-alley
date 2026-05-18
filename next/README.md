# The Watch Alley Next.js App

This is the active deployable app for The Watch Alley.

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm exec biome check src
pnpm exec tsc --noEmit
```

## Deployment

Vercel should use this directory as the project root:

```text
Root Directory: next
Framework Preset: Next.js
```

## Route Ownership

Native App Router routes:

- `/`
- `/available`
- `/sold`
- `/journal`
- `/journal/[slug]`
- `/watch/[slug]`

Static bridge routes in `public/`:

- `/admin`
- `/privacy`
- `/terms`
- `/authenticity`

The bridge keeps current operator workflows alive during cutover. The next major
engineering pass should replace it with native App Router admin pages, auth
gating via `proxy.ts`, and Server Actions.
