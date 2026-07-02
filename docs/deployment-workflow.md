# Watch Alley Deployment Workflow

Production deploys should flow through GitHub.

## Production Vercel Project

- Production project: `https://vercel.com/hype-kidz/watch-alley`
- Analytics dashboard: `https://vercel.com/hype-kidz/watch-alley/analytics`
- Plan/ownership: Hype Kidz Vercel Pro project.
- Do not rely on local `.vercel/project.json` as production ownership truth; this workspace has previously been linked to a different Vercel team/project.

## Default Flow

1. Fetch GitHub first:
   ```sh
   git fetch origin
   git status --short --branch
   ```
2. If `master` is behind `origin/master`, fast-forward or otherwise integrate the latest GitHub changes before editing:
   ```sh
   git merge --ff-only origin/master
   ```
3. Make and validate changes locally:
   ```sh
   pnpm run check
   pnpm run build
   ```
4. Commit and push to GitHub:
   ```sh
   git add <files>
   git commit -m "<message>"
   git push origin master
   ```
5. Let the Hype Kidz Vercel Pro project deploy from the GitHub push.

## Important Notes

- Do not use local `vercel deploy --prod` as the normal Watch Alley release path. The custom domain can be attached to a different Vercel team/project than the local `.vercel/project.json`.
- The production Vercel project for the public domain is `hype-kidz/watch-alley`; treat the GitHub push as the source of truth for production deployment.
- Use Vercel CLI/API for inspection only unless the user explicitly asks for a direct Vercel deployment.
- Keep `.env`, `.env.*`, `.vercel`, and local Vercel audit files out of deployments. `.vercelignore` covers this.
- After pushing, verify the live domain, not only the deployment URL:
  ```sh
  curl -I https://www.thewatchalley.com/admin
  ```
