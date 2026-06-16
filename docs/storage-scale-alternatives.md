# Watch Alley Storage and Scale Alternatives

Last reviewed: 2026-06-13

## Current Recommendation

Stay on the current stack for now:

- Supabase remains the source of truth for inventory, journal content, inquiries, admin state, and image references.
- Watch images are compressed before upload and stored in canonical `watches/<watch-slug>/...` folders.
- The storefront serves Supabase image URLs directly instead of using Vercel Image Optimization, avoiding the Vercel image quota failure mode.
- Run periodic storage audits before deleting files; do not delete journal images until the audit can prove they are unreferenced.

This keeps the admin workflow simple and avoids a migration while storage pressure is still manageable.

## Decision Triggers

Revisit this document when one or more of these become true:

- Supabase storage exceeds the free/grace limits again after compression and cleanup.
- The client uploads enough new watches that manual audits become a monthly burden.
- Image variants become a product need: thumbnails, square crops, watermarks, social poster sizes, CDN transformations, or automated format negotiation.
- Traffic makes direct Supabase image delivery meaningfully slow or risky.
- The business accepts a small fixed monthly infrastructure cost in exchange for lower operational risk.

## Shortlist

### 1. Cloudinary

Best pivot if image management becomes painful.

Why it fits:

- Purpose-built for image upload, transformation, optimization, CDN delivery, and asset management.
- Strong fit for watch listings because we may eventually need thumbnails, social crops, watermarking, and consistent responsive variants.
- Official pricing currently lists a Free plan with upload/API/search, image and video transformations, CDN delivery, $0/free forever, and no credit card required.

Tradeoffs:

- Adds another vendor and another API to the admin workflow.
- Free plan limits can still become a constraint if traffic or transformations grow.
- The cleanest implementation would store Cloudinary public IDs/URLs in Supabase, not replace Supabase as the inventory database.

Verdict:

Best future image-management pivot. Choose this before AWS/GCP if the problem is image workflow, not raw storage.

Source: https://cloudinary.com/pricing

### 2. Cloudflare R2

Best pivot for cheap object storage at scale.

Why it fits:

- Official R2 docs currently list 10 GB-month/month free on Standard storage, 1 million Class A operations/month, 10 million Class B operations/month, and free egress to the Internet.
- Standard storage is currently listed at $0.015/GB-month after the free tier.
- Good long-term store for original and compressed watch photos.

Tradeoffs:

- R2 is object storage, not an image management system.
- We would need more custom upload plumbing from the admin panel.
- Image resizing/optimization would need another layer: browser-side compression, Cloudflare Images, Workers, or a separate image service.
- More engineering responsibility than Cloudinary.

Verdict:

Best raw-storage pivot if Supabase Storage cost/limits become the main pain and we want low egress cost. Less attractive if the real pain is transformations and admin simplicity.

Source: https://developers.cloudflare.com/r2/pricing/

### 3. Local Static Assets in the Repo

Best only for emergency/simple rollback.

Why it fits:

- Zero new vendor.
- Very predictable production behavior because images deploy with the site.

Tradeoffs:

- Bad admin workflow: every new watch photo needs a developer commit and deploy.
- Repo bloat grows quickly.
- Not appropriate for a client-managed inventory CMS.

Verdict:

Do not choose this for normal operations. Keep only as a fallback for a small curated set of permanent brand/static assets.

## Other Options Asked About

### Metabase

Good tool, wrong category for image storage.

Metabase is business intelligence and reporting. It can connect to Supabase/Postgres later so the team can analyze inquiries, watch turnover, sold inventory, source channels, and pricing history. It does not replace Supabase Storage, Vercel, Cloudinary, or R2.

Useful later if:

- The client wants dashboards for sales/inquiries.
- We want private operational reporting without building every chart into the admin CMS.

Not useful for:

- Solving image upload/storage limits.
- Hosting the public website.

Official pricing currently lists an Open Source self-hosted plan at $0, but self-hosting needs a server. Managed Starter is currently listed from $100/month plus per-user pricing.

Source: https://www.metabase.com/pricing/

### Firebase

Good platform, but not the best pivot for this project right now.

Firebase has Cloud Storage, Hosting, Auth, Firestore, Functions, and good Google integration. Official pricing currently lists Spark/no-cost plan limits including Cloud Storage no-cost quotas, with newer `*.firebasestorage.app` buckets showing 5 GB-month stored, 100 GB/month downloaded, 5K uploads/month, and 50K downloads/month in eligible regions.

Why it is not my first recommendation:

- Watch Alley already has Supabase/Postgres, RLS, admin RPCs, inventory views, and storage references.
- Moving the backend to Firebase would be a real migration, not just a storage swap.
- Firestore is document-oriented; our current inventory/admin model benefits from Postgres.

Where it could fit:

- If the whole backend were being rebuilt around Google/Firebase.
- If mobile app features, push notifications, or Firebase-native analytics became central.

Verdict:

Not bad, just not worth the migration for this specific image problem.

Source: https://firebase.google.com/pricing

### AWS

Very capable, but too much operational surface for the current phase.

AWS S3 plus CloudFront is a proven image storage/delivery stack. It is robust, flexible, and can scale far beyond Watch Alley. AWS pricing is usage-based; official S3 pricing notes storage, request, retrieval, and transfer considerations, and the AWS Free Tier currently uses credits for new customers.

Why it is not my first recommendation:

- More IAM, bucket policy, CORS, CDN, cache invalidation, monitoring, and billing complexity.
- Easy to build correctly, but also easy to overbuild for a small inventory site.
- Cloudinary or R2 solves the immediate image problem with less moving machinery.

Where it could fit:

- If Joseph/client already has AWS expertise.
- If Watch Alley later needs a broader AWS architecture, not only image storage.

Verdict:

Good enterprise option; overkill as the next move.

Sources:

- https://aws.amazon.com/s3/pricing/
- https://aws.amazon.com/cloudfront/pricing/

### Google Cloud

Technically strong, but similar story to AWS.

Google Cloud Storage is a durable object storage option, and Firebase Storage is built on Google Cloud Storage. Official Google Cloud Storage pricing is based on data storage, data processing/operations, network usage, and optional cache/bucket features.

Why it is not my first recommendation:

- More cloud-platform setup and billing awareness than Cloudinary/R2.
- It solves storage, but not image workflow by itself.
- If we are not already standardizing on Google Cloud, it is extra platform weight.

Where it could fit:

- If the client already operates in Google Cloud.
- If we move toward Firebase or BigQuery-heavy reporting.

Verdict:

Solid, but not the next practical step for Watch Alley images.

Source: https://cloud.google.com/storage/pricing

### Cloudways

Not a natural fit for this app.

Cloudways is managed cloud hosting, especially strong for WordPress/WooCommerce/PHP-style workloads. Official pricing currently shows WordPress-oriented plans, a 3-day trial, included disk/bandwidth, and managed features.

Why it is not my first recommendation:

- Watch Alley is a Next.js app on Vercel with Supabase behind it, not a WordPress app.
- Moving to Cloudways would change hosting operations without directly solving image asset workflow.
- It introduces server management concepts that Vercel currently hides from us.

Where it could fit:

- If the business intentionally pivots to WordPress/WooCommerce.
- If Joseph/client wants managed PHP hosting rather than Vercel.

Verdict:

Not bad, just mismatched to this stack.

Source: https://www.cloudways.com/en/pricing.php

## Recommended Roadmap

### Now

- Keep Supabase.
- Keep client-side image compression.
- Keep direct Supabase image delivery to avoid Vercel Image Optimization costs.
- Keep canonical slug folders.
- Run storage audits before cleanup.

### If Storage Pressure Returns

First consider Cloudinary if we want better image workflow.

Choose Cloudinary when the pain is:

- Transformations
- Responsive image variants
- CDN image delivery
- Easy media admin
- Future social/poster crops

Choose Cloudflare R2 when the pain is:

- Raw storage volume
- Egress cost
- Needing S3-compatible object storage
- Willingness to maintain custom upload and image-variant code

### If Analytics Becomes Important

Add Metabase as a separate analytics layer connected to Supabase/Postgres. Do not use it as a storage/hosting substitute.

### Avoid for Now

- Full Firebase migration
- AWS/GCP object storage migration
- Cloudways hosting migration
- Repo-stored inventory images

These are all valid in the right business context, but they are not the lowest-risk answer to Watch Alley's current image upload/storage problem.
