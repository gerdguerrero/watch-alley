# Watch Alley Scale Strategy

Last reviewed: 2026-06-13

## Honest Opinion

The Watch Alley is past the "small brochure site" stage.

The site is doing what it is supposed to do: it is attracting buyers, creating inquiries, and giving the brand a premium surface. That is excellent. It also changes the engineering posture. We should stop optimizing only for "free" and start optimizing for "cheap, stable, and boring." For a client with thousands of watches and active buyer demand, a small predictable infrastructure bill is less risky than repeated quota incidents, broken images, or missed inquiries.

My recommendation:

1. Keep the current architecture for now: Next.js on Vercel, Supabase for data/storage/auth/admin state.
2. Move the production Supabase project to a paid plan before storage pressure returns.
3. Keep Vercel Image Optimization disabled for watch photos unless the project is on a plan where image transformations are intentionally budgeted.
4. Add operational dashboards and monitoring before rebuilding the stack.
5. Revisit Cloudinary or Cloudflare R2 only when a specific pressure appears: image workflow pain for Cloudinary, raw storage/egress pressure for R2.

The stack is directionally right. The weak points are not the framework or database choice; they are quota posture, admin workflow maturity, search/filter depth, inquiry operations, and observability.

## Current Baseline

Measured from production Supabase on 2026-06-13:

| Metric | Current value |
| --- | ---: |
| Published watches | 174 |
| Available watches | 162 |
| Reserved watches | 7 |
| Sold watches | 5 |
| Watch image references | 1,024 |
| Average images per watch | 5.89 |
| Largest image count on a watch | 14 |
| `watches` bucket storage | 951.45 MB |
| `journal-images` bucket storage | 15.63 MB |
| Missing referenced watch files | 0 |
| Watch bucket orphan files | 0 |

Derived storage averages:

| Derived metric | Estimate |
| --- | ---: |
| Average size per watch image | 0.93 MB |
| Average image storage per watch | 5.47 MB |
| Estimated image storage for 1,000 watches | 5.47 GB |
| Estimated image storage for 5,000 watches | 27.35 GB |
| Estimated image storage for 10,000 watches | 54.70 GB |

This is good news. The current compression strategy is working. Thousands of watches are realistic if we stop living on a 1 GB free storage ceiling.

## Architecture Assessment

### What Is Strong

- Next.js App Router on Vercel is a good fit for a premium storefront: SEO pages, product metadata, ISR, fast public reads, and simple deploys.
- Supabase/Postgres is a good fit for inventory, inquiries, admin state, journal content, and future reporting.
- The admin workflow now supports upload, reorder, draft/publish, reserved/sold state, social copy, journal, and inquiry handling.
- Images are now organized under stable watch slug folders.
- Watch slugs are now stable after creation, protecting public URLs.
- Direct Supabase image delivery avoids Vercel Image Optimization quota failures.

### What Is Risky

- The production system is too close to Supabase free storage limits.
- The admin is still a static bridge under `public/admin`, not a native authenticated App Router admin.
- Search/filter is still basic for a client with thousands of watches.
- The inquiry pipeline exists, but needs stronger reporting, assignment, follow-up, and lost-reason discipline.
- Observability is light: we need to know before clients tell us that uploads, images, or inquiries are broken.
- Joseph owns production Vercel, so production access/deploy ownership should be documented as an operational dependency.

### What I Would Not Do Yet

- I would not migrate the whole backend to Firebase.
- I would not move the app to Cloudways.
- I would not put inventory images in the Git repo.
- I would not move everything to AWS/GCP just because they scale. They scale, but they also increase operational surface.
- I would not build checkout until the inquiry funnel and manual sales operations are measured and stable.

## Recommended Target Architecture

```text
Buyer
  |
  v
thewatchalley.com
  |
  v
Vercel + Next.js App Router
  |-- Public storefront pages: SEO, watch pages, journal, available/sold
  |-- API routes/server actions: inquiry submit, revalidate, future admin actions
  |
  v
Supabase
  |-- Postgres: watches, inquiries, journal, social drafts, admin allowlist
  |-- Auth: admin users
  |-- Storage: watch photos and journal images
  |-- RLS/RPCs: secure public/admin access
  |
  +--> Optional future: Metabase for internal dashboards
  +--> Optional future: Cloudinary for image workflow
  +--> Optional future: Cloudflare R2 for cheap raw object storage
```

The key principle: keep Supabase as the business source of truth even if images move later. If we move images to Cloudinary or R2, Supabase should still store the watch records and image URLs/public IDs.

## Timeline

### Phase 0: Already Done

Status: done or mostly done.

- Cleaned and organized Supabase watch storage.
- Compressed large watch images.
- Removed confirmed watch image orphans.
- Disabled Vercel image optimizer usage for watch images.
- Made future uploads use `watches/<watch-slug>/...`.
- Made watch slugs stable after creation.

### Phase 1: Stabilize for Growth

Timeline: next 1 week.

Priority:

- Upgrade production Supabase to a paid plan before the storage quota becomes an incident again.
- Confirm Joseph's Vercel production project has billing/spend alerts enabled.
- Add a documented monthly storage audit process.
- Add a lightweight weekly inquiry report: new inquiries, top watches, reserved/sold, lost reasons.
- Make sure inquiry submission failures are logged and visible.

Definition of done:

- No quota grace-period warnings.
- A non-developer can upload new watches confidently.
- The team can see whether inquiries are increasing or breaking.

### Phase 2: Scale the Catalog UX

Timeline: weeks 2-4.

Priority:

- Add robust search: brand, model/reference, badge, condition, price band, status.
- Add brand/category landing pages for SEO and browsing.
- Add pagination or cursor loading for `/available` and `/sold`.
- Add indexes in Postgres for common filters and sort fields.
- Add admin bulk tools: draft list, missing photos, unpublished, recently added, stale reserved, sold this month.

Definition of done:

- 1,000+ watches can exist without the storefront or admin becoming hard to scan.
- Buyers can find pieces quickly.
- Admin can manage inventory without terminal help.

### Phase 3: Lead CRM and Reporting

Timeline: month 2.

Priority:

- Expand inquiry dashboard into a true light CRM.
- Track source: website, IG, FB, Viber, referral, direct.
- Require lost reason on lost inquiries.
- Add follow-up date and "needs reply" queue.
- Add weekly automated summary.
- Consider Metabase for internal dashboards if custom admin charts become too slow to build.

Definition of done:

- The business knows which watches generate demand.
- No serious buyer inquiry gets buried.
- Joseph/client can answer "what should we source next?" from data, not memory.

### Phase 4: Media Workflow Upgrade

Timeline: month 2-3, only if needed.

Decision:

- Choose Cloudinary if image transformations, variants, and asset management are the pain.
- Choose Cloudflare R2 if raw storage/egress cost is the pain.
- Stay on Supabase Storage if the paid Supabase quota comfortably covers growth.

Definition of done:

- Uploads are predictable.
- Images render fast.
- Storage costs are boring.
- No developer is needed for normal image cleanup.

### Phase 5: Operational Maturity

Timeline: months 3-6.

Priority:

- Native App Router admin to replace the static admin bridge.
- Server Actions or route handlers for admin writes.
- Better audit logs for inventory changes.
- Role separation if more staff use the admin.
- Backup/export workflow for inventory and inquiries.
- Optional: consignment intake pipeline and seller forms.

Definition of done:

- Watch Alley behaves like an operating system for inventory and leads, not just a beautiful storefront.

## Pricing Snapshot

Prices and free tiers change. Re-check sources before committing to a plan.

### Core Production Stack

| Provider | Current relevant pricing | What it means for Watch Alley |
| --- | --- | --- |
| Supabase Free | Free plan includes 1 GB Storage Size, 500 MB database, 5 GB egress, 50K MAU, and two free projects. | Already too tight. Current watch images alone are 951.45 MB. This is not a safe production posture. |
| Supabase Pro/Team usage quotas | Paid plans include 100 GB storage, 250 GB egress, 8 GB disk per project, then storage overage at $0.021/GB and egress at $0.09/GB. Compute is separate. | Strong fit. At current compression, 100 GB storage can hold roughly 18K watches worth of images before overage, assuming similar image count/size. |
| Supabase compute | Micro is listed around $10/month, Small around $15/month, Medium around $60/month. Compute changes can involve downtime. | Start small; upgrade only if DB metrics show pressure. Query/index tuning comes before bigger compute. |
| Vercel Hobby | Free, includes CDN, CI/CD, 100 GB fast data transfer, 5K image transformations, and image quotas that can hard-fail when exceeded. | Good for early tests. Not ideal for a growing commercial client site. We bypassed image optimization to avoid quota failures. |
| Vercel Pro | $20/month per developer seat plus usage. Includes $20 usage credit, 1 TB fast data transfer, higher included usage, and spend management. | Recommended for serious production ownership if Joseph is operating the commercial site. |

Sources:

- Supabase billing docs: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase compute docs: https://supabase.com/docs/guides/platform/compute-and-disk
- Vercel pricing: https://vercel.com/pricing

### Image Storage and Delivery Alternatives

| Option | Current relevant pricing | Strength | Concern | My ranking |
| --- | --- | --- | --- | --- |
| Supabase Storage | Free: 1 GB storage. Paid included quota: 100 GB storage; overage listed at $0.021/GB. | Simplest because data and image references stay in one system. | Current project is already near free limit. | Best now if upgraded. |
| Cloudinary Free | Free plan lists image/video transformations, CDN delivery, upload/API/search, $0/free forever, no credit card required, and 25 monthly credits. DAM free plan lists 25 GB storage. | Best image workflow: transformations, CDN, variants, search, media management. | Another vendor; credit-based limits need watching. | Best pivot if image workflow gets painful. |
| Cloudflare R2 | 10 GB-month free, 1M Class A ops, 10M Class B ops, free internet egress. Standard storage listed at $0.015/GB-month. | Very cheap raw storage and free egress. | More custom code; no built-in image workflow. | Best pivot if raw storage/egress is the pain. |
| Firebase Storage | No-cost quotas include 5 GB-month stored and 100 GB/month downloaded for eligible newer buckets; upload/download operation quotas apply. | Good if going all-in on Firebase/Google. | Backend migration; less natural than Supabase/Postgres for current app. | Not recommended now. |
| AWS S3 + CloudFront | Usage-based storage, request, CDN, and transfer pricing. Very mature. | Enterprise-grade and flexible. | More IAM/CDN/billing complexity. | Overkill unless AWS is already the client's home. |
| Google Cloud Storage | Usage-based data storage, processing/operations, and network pricing. | Durable and scalable. | Similar complexity to AWS; no image workflow by itself. | Overkill unless GCP/Firebase becomes strategic. |

Sources:

- Cloudinary pricing: https://cloudinary.com/pricing
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Firebase pricing: https://firebase.google.com/pricing
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing

### Analytics and Operations

| Option | Current relevant pricing | Use | Recommendation |
| --- | --- | --- | --- |
| Built-in admin dashboard | Existing code and Supabase queries. | Operational view for inventory/inquiries. | Build this first for high-signal metrics. |
| Metabase Open Source | $0, self-hosted. | Internal analytics dashboards. | Good later if someone can host/manage it. |
| Metabase Starter | Listed at $100/month plus per-user pricing. | Managed BI without hosting Metabase yourself. | Useful once reporting saves enough time to justify it. |
| Vercel Analytics/Speed Insights | Vercel pricing lists included events and paid add-ons/usage. | Frontend traffic/performance. | Use when Joseph's Vercel account is ready to monitor production. |

Source: https://www.metabase.com/pricing/

## Cost Scenarios

These are planning estimates, not invoices.

| Scenario | Monthly baseline | When it fits | Risk |
| --- | ---: | --- | --- |
| Stay fully free | $0 | Only if uploads pause and traffic stays modest. | High. Current storage is already too close to free limits. |
| Minimal serious production | About $25-$45/month | Supabase paid plan plus Vercel Pro if production account uses Pro. | Low for current scale. Best immediate move. |
| Supabase + Cloudinary free | About $25-$45/month | Keep DB/storage simple, use Cloudinary only when image workflow needs it. | Need Cloudinary credit monitoring. |
| Supabase + R2 | About $25-$45/month plus tiny R2 usage | Raw image storage grows beyond Supabase comfort. | More engineering and migration work. |
| Supabase + Metabase managed | About $125-$145/month plus usage | Client wants serious reporting with less custom development. | Worth it only when reporting is actively used. |
| AWS/GCP rebuild | Highly variable | Larger org standardizes on AWS/GCP. | Overengineering risk right now. |

My honest business read: if the website is producing real buyer inquiries, the cheapest responsible posture is not $0. It is a small predictable monthly budget that prevents quota failures.

## Scaling Strategy by Area

### Media

Now:

- Keep in-browser compression.
- Keep WebP upload target.
- Keep canonical watch slug folders.
- Keep direct Supabase delivery.
- Run monthly audit and cleanup.

Next:

- Add server-side validation for max images per watch and total image count.
- Add admin warnings when images are too large or too many.
- Decide whether to cap public gallery images per watch, for example 8-10, while retaining extra internal photos only if needed.

Later:

- Cloudinary if we need transformations/social crops/watermarks.
- R2 if storage grows faster than workflow complexity.

### Database and Inventory

Now:

- Keep Supabase/Postgres.
- Add indexes for filters before catalog volume jumps.
- Preserve slugs after creation.
- Keep draft/publish state.

Next:

- Cursor pagination for catalog pages.
- Search by brand, model, reference, badge, price band, status.
- Admin filters for stale reserved, recently published, missing metadata, no inquiries.

Later:

- Read replicas only if read traffic becomes a real bottleneck.
- Bigger compute only if query and index work does not solve performance.

### Inquiries and CRM

Now:

- Treat inquiry capture as mission-critical.
- Add failure visibility.
- Add weekly report.

Next:

- Lead owner/status.
- Follow-up date.
- Lost reason required.
- Source attribution.
- Reply templates.

Later:

- Waitlist and "notify me when similar arrives."
- Consignment intake.
- Viber/IG/FB source loop.

### Frontend and SEO

Now:

- Keep ISR and clean product pages.
- Keep sold archive.
- Keep journal authority content.

Next:

- Brand/category landing pages.
- Search/filter pages that can rank.
- Sitemap strategy for thousands of watch URLs.

Later:

- Structured content around references, buying guides, condition guides, and sold price observations.

### Operations

Now:

- Document ownership: Joseph owns production Vercel; Buloy/dev side can push GitHub master.
- Keep production deploy path GitHub-first.
- Add billing alerts on Supabase and Vercel.

Next:

- Monthly audit checklist.
- Admin QA checklist before publish.
- Backup/export process for inventory and inquiries.

Later:

- Native admin rebuild.
- Audit logs.
- Role-based admin permissions.

## Immediate Action Plan

### This Week

1. Upgrade production Supabase or confirm Joseph/client accepts the risk of staying near free storage limits.
2. Ask Joseph to confirm Vercel plan, spend limits, and deployment ownership.
3. Add a recurring monthly storage audit task.
4. Add a weekly inquiry report from Supabase.

### Next 30 Days

1. Add catalog pagination and better filters.
2. Add Postgres indexes for the actual filter/sort fields.
3. Strengthen admin inquiry dashboard.
4. Add explicit source/lost-reason reporting.
5. Decide whether Cloudinary is needed for image workflow.

### Next 90 Days

1. Rebuild `/admin` as native App Router admin.
2. Add waitlist and "similar watch" demand capture.
3. Add Metabase or native reporting if weekly reporting becomes important.
4. Decide whether to split image storage from Supabase.

## Final Recommendation

The best path is not a dramatic platform migration. The best path is boring scale:

- Supabase paid plan soon.
- Vercel production account properly owned and monitored.
- Keep image compression and direct delivery.
- Build search, pagination, inquiry reporting, and admin operations.
- Only pivot image storage when the pain is specific enough to choose Cloudinary or R2 with confidence.

If Watch Alley is genuinely blowing up, the platform should start acting like a business system, not a free demo. The codebase is close enough that we can get there incrementally.
