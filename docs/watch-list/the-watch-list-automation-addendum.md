# The Watch Alley Newsletter Automation Addendum

**Project:** The Watch List by The Watch Alley  
**Document Type:** Automation / AI Operations Handover  
**Audience:** Founder, Product Manager, Developer, AI Coding Agent  
**Prepared For:** The Watch Alley / thewatchalley.com  
**Purpose:** Extend the initial newsletter handover into an AI-assisted content, drafting, review, scheduling, and sending system.

---

## 1. Executive Summary

The original newsletter concept focused on subscriber capture, preferences, sold-watch alerts, and sourcing requests. This addendum expands the project into an AI-assisted newsletter operations system.

The goal is **not** to let AI blindly publish or send emails. The goal is to build a system where AI can:

1. Inspect available watches, sold archive entries, journal posts, and sourcing themes.
2. Draft a weekly or biweekly newsletter.
3. Recommend which available and sold watches to feature.
4. Generate or suggest supporting editorial images when appropriate.
5. Create an editable draft inside an admin panel.
6. Wait for human review and approval.
7. Send only after manual approval or explicit scheduling.
8. Archive each issue publicly or internally for future reuse.

The desired operating model is:

> AI drafts. Human approves. System sends. Archive compounds.

This converts The Watch Alley from a watch reseller with content into a repeatable collector-media and commerce engine.

---

## 2. Strategic Rationale

The Watch Alley already has high-value source material:

- Available watch inventory
- Sold archive
- Product photos
- Brand/reference/spec metadata
- Journal/editorial content
- Private Collecting Desk positioning
- Buyer inquiry patterns

A newsletter automation system lets the business repeatedly transform these assets into:

- Weekly sales opportunities
- Collector education
- First-access watch drops
- Buyer preference signals
- Sourcing leads
- Evergreen content
- Public archives that build SEO and brand authority

This is especially useful for watches because availability is time-sensitive. A good piece can sell quickly, and buyers often need repeated exposure before they inquire.

---

## 3. Automation Philosophy

The system should be built in stages.

### Stage 1: Manual-first newsletter creation

Admin manually creates newsletter issues, selects watches, edits copy, and sends test emails.

### Stage 2: AI-assisted drafting

AI suggests issue structure, subject lines, watch notes, sold archive highlights, and CTAs based on current inventory and editorial rules.

### Stage 3: Human-in-the-loop approval

AI-generated issues appear in the admin dashboard as drafts. A human must approve before scheduling or sending.

### Stage 4: Scheduled sending

A cron job sends only issues that have been approved and scheduled.

### Stage 5: Smart reuse and evergreen automations

Old issues and articles are repurposed into onboarding sequences, best-of collections, seasonal guides, and updated reruns.

---

## 4. What an AI Coding Agent Can and Cannot Do

### An AI coding agent can help build:

- Database schema
- Admin dashboard
- Newsletter issue editor
- AI draft generation endpoint
- API integrations with email providers
- Scheduled cron routes
- Approval workflow
- Test email flow
- Archive pages
- Content selection logic
- Prompt templates
- Guardrails and validation

### An AI coding agent should not be the live automation runtime

Codex, Claude Code, Cursor, or similar tools are best used to implement the feature in the codebase. The production automation should run inside the app infrastructure, such as:

- Vercel Cron Jobs
- Supabase scheduled functions
- Supabase Edge Functions
- A queue worker
- A serverless function
- A third-party email platform automation

### Key principle

> The coding agent builds the machine. The website infrastructure runs the machine. A human approves what the machine sends.

---

## 5. Recommended System Architecture

Assuming the current stack is similar to Vercel + Supabase, use this architecture:

```txt
Website / Admin Dashboard
        |
        v
Supabase Database
        |
        +--> Inventory / Watches
        +--> Sold Archive
        +--> Journal Posts
        +--> Subscribers
        +--> Newsletter Issues
        +--> Newsletter Items
        +--> AI Generation Runs
        +--> Send Logs
        |
        v
AI Draft Endpoint
        |
        +--> LLM text generation
        +--> Optional image generation
        +--> Draft issue creation
        |
        v
Admin Review Panel
        |
        +--> Edit copy
        +--> Replace watches
        +--> Regenerate sections
        +--> Send test email
        +--> Approve
        +--> Schedule
        |
        v
Cron Job / Scheduled Function
        |
        v
Email Provider API
        |
        v
Subscribers
```

---

## 6. Core Workflow

### 6.1 Weekly AI draft workflow

1. Scheduled job runs weekly, or admin clicks `Generate Draft`.
2. System fetches candidate content:
   - Newly added available watches
   - High-priority available watches
   - Sold watches from the archive
   - Recent journal posts
   - Evergreen collector topics
3. System builds a structured prompt for the AI model.
4. AI returns newsletter draft JSON:
   - Subject line options
   - Preheader options
   - Intro
   - Featured watches
   - Sold archive highlight
   - Collector note
   - CTAs
   - Suggested image prompt or image source
5. System saves the result as a newsletter issue with status `draft` or `needs_review`.
6. Admin reviews and edits.
7. Admin sends a test email.
8. Admin approves and schedules.
9. Cron job sends the approved scheduled issue.
10. System logs send status and archives the issue.

---

## 7. Human-in-the-Loop Approval Flow

Use the following status model:

```txt
draft
needs_review
approved
scheduled
sending
sent
archived
rejected
failed
```

Rules:

- AI can create `draft` or `needs_review` issues only.
- AI cannot mark an issue as `approved`.
- AI cannot send directly to subscribers.
- Only an authenticated admin can approve.
- Only `approved` or `scheduled` issues can be sent.
- Every send must have a `send_log` record.
- Every AI generation must have an `ai_generation_run` record.

---

## 8. Admin Dashboard Requirements

Add an admin page such as:

```txt
/admin/newsletters
/admin/newsletters/new
/admin/newsletters/[id]
/admin/newsletters/[id]/preview
```

### Admin list page

Show:

- Issue title
- Subject line
- Status
- Created date
- Scheduled send date
- Last edited by
- AI-generated or manual
- Actions: Edit, Preview, Send Test, Approve, Schedule, Archive

### Issue editor

Fields:

- Internal title
- Public issue title
- Subject line
- Preheader
- Intro copy
- Featured available watches
- Sold archive highlights
- Journal/article links
- Collector note
- Primary CTA
- Secondary CTA
- Hero image
- Footer note
- Status
- Scheduled send date/time

### AI tools inside editor

Buttons:

- Generate draft
- Regenerate subject lines
- Rewrite intro
- Shorten copy
- Make more premium
- Make more conversational
- Replace featured watches
- Generate image prompt
- Generate hero image
- Suggest CTAs

### Required preview modes

- Desktop email preview
- Mobile email preview
- Plain-text preview
- Public archive preview

---

## 9. Database Model Additions

The initial handover may already include subscribers and preferences. Add these tables for automation.

### `newsletter_issues`

Suggested fields:

```sql
id uuid primary key default gen_random_uuid(),
slug text unique,
internal_title text,
public_title text,
subject text,
preheader text,
intro_html text,
body_html text,
body_text text,
status text not null default 'draft',
source_type text default 'manual', -- manual, ai_assisted, ai_generated
hero_image_url text,
hero_image_prompt text,
scheduled_at timestamptz,
sent_at timestamptz,
created_by uuid,
approved_by uuid,
approved_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `newsletter_issue_items`

Links newsletter issues to watches, sold items, journal posts, or custom content.

```sql
id uuid primary key default gen_random_uuid(),
issue_id uuid references newsletter_issues(id) on delete cascade,
item_type text not null, -- available_watch, sold_watch, journal_post, custom_note, sourcing_cta
item_id uuid,
title text,
summary text,
url text,
image_url text,
position int,
created_at timestamptz default now()
```

### `ai_generation_runs`

```sql
id uuid primary key default gen_random_uuid(),
issue_id uuid references newsletter_issues(id) on delete set null,
run_type text not null, -- full_issue, subject_lines, intro, image_prompt, hero_image
model text,
prompt_version text,
input_payload jsonb,
output_payload jsonb,
status text default 'completed',
error_message text,
created_at timestamptz default now()
```

### `newsletter_send_logs`

```sql
id uuid primary key default gen_random_uuid(),
issue_id uuid references newsletter_issues(id) on delete cascade,
provider text,
provider_campaign_id text,
status text,
recipient_count int,
sent_at timestamptz,
error_message text,
created_at timestamptz default now()
```

### `evergreen_content_library`

Used for reusable collector notes.

```sql
id uuid primary key default gen_random_uuid(),
title text,
slug text unique,
category text, -- beginner, buying_guide, brand_note, maintenance, market_note
body text,
summary text,
status text default 'active',
last_used_at timestamptz,
times_used int default 0,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

---

## 10. API / Route Requirements

Exact paths should follow the existing framework. Suggested routes:

```txt
POST /api/newsletter/generate-draft
POST /api/newsletter/generate-section
POST /api/newsletter/send-test
POST /api/newsletter/approve
POST /api/newsletter/schedule
POST /api/newsletter/send-approved
GET  /api/cron/newsletter-draft
GET  /api/cron/newsletter-send
```

### Security requirements

- Cron routes must require a secret token.
- Admin routes must require admin authentication.
- Do not expose AI provider keys in the frontend.
- Do not expose email provider keys in the frontend.
- Log all AI generations and sends.
- Rate-limit AI generation endpoints.
- Prevent accidental duplicate sending.

---

## 11. Cron / Scheduled Job Strategy

The user said “Chrome job,” but the correct term is **cron job**.

Recommended jobs:

### Weekly draft generation

Runs weekly, for example every Monday morning.

```txt
/api/cron/newsletter-draft
```

Behavior:

- Check if a draft already exists for the current week.
- If not, generate a new draft and mark it `needs_review`.
- Do not send anything.

### Approved issue sending

Runs daily or hourly.

```txt
/api/cron/newsletter-send
```

Behavior:

- Find issues with status `scheduled` and `scheduled_at <= now()`.
- Validate that the issue was approved.
- Send via email provider.
- Mark as `sending`, then `sent` or `failed`.
- Create send log.

---

## 12. Email Provider Options

### Option A: Beehiiv

Best if The Watch Alley wants the newsletter to become a media brand with publication-style growth tools.

Pros:

- Newsletter-native
- Subscriber management
- Growth tools
- Referral and monetization features
- Good for publication-style archive

Cons:

- Less custom than fully owned email infrastructure
- Some advanced automations may depend on platform plan/features

### Option B: Resend

Best if the developer wants full custom control from the existing website/admin.

Pros:

- Developer-friendly API
- Works well with custom apps
- Good for transactional and custom broadcast flows
- Can keep admin experience inside The Watch Alley site

Cons:

- Requires more custom development
- Need to build more campaign management and analytics yourself

### Option C: Klaviyo / Mailchimp / Brevo

Best if the business wants standard email marketing tools and less engineering.

Pros:

- Mature marketing features
- Segmentation
- Templates
- Analytics

Cons:

- May feel less integrated with the custom collector workflow
- Automation and API complexity varies

### Recommendation

For the first AI-assisted custom admin flow:

> Use Resend if we want full control inside the website. Use Beehiiv if we want The Watch Alley to become more of a publication/community newsletter brand quickly.

---

## 13. AI Content Generation Rules

AI must not invent facts.

The model may rewrite and summarize, but all factual product information must come from existing database fields.

### Allowed AI tasks

- Write intros
- Write collector notes
- Summarize available watches
- Suggest subject lines
- Suggest CTAs
- Suggest issue themes
- Generate editorial image prompts
- Generate non-product hero images
- Repurpose evergreen articles

### Restricted AI tasks

AI must not fabricate:

- Watch condition
- Authenticity claims
- Warranty details
- Inclusions
- Price
- Availability
- Movement/specs
- Case size
- Service history
- Limited edition status
- Market value

### Required product data rule

For every product card in a newsletter, use database values only for:

- Brand
- Model
- Reference
- Price
- Availability
- Condition
- Inclusions
- Product URL
- Product image

---

## 14. AI Image Generation Strategy

Use AI images carefully.

### Best use cases

- Editorial hero images
- Mood-board style headers
- “Manila collector desk” visuals
- Abstract watch collecting visuals
- Watch storage / watch stand concept art
- Seasonal campaign graphics
- Background montage images

### Avoid

- Generating fake images of actual watches being sold
- Replacing real product photos with AI-generated product photos
- Creating misleading condition or authenticity visuals
- Generating branded watch designs that look like counterfeit product renders

### Preferred approach

1. Use real product images for actual available and sold watches.
2. Use AI only for editorial or campaign visuals.
3. Clearly separate product photography from editorial imagery.
4. Store image prompt, model, and generated image URL.
5. Require admin approval before using any AI-generated image in an email.

---

## 15. Newsletter Repurposing Strategy

Yes, repurposing and resending content is normal and recommended.

The system should support these content reuse formats:

### 15.1 Public archive

Every sent issue can be saved as a public page:

```txt
/watch-list/archive/[slug]
```

Benefits:

- New subscribers can read old issues.
- Archive builds SEO.
- Archive gives the brand credibility.
- Links can be shared on social media.

### 15.2 Welcome sequence

New subscribers should receive evergreen content automatically.

Example sequence:

- Email 1: Welcome to The Watch List
- Email 2: How to choose your first serious watch
- Email 3: JDM Seiko and why collectors care
- Email 4: How The Watch Alley sourcing works
- Email 5: Best sold pieces from the archive

### 15.3 Best-of issues

Every 1-2 months, resend or repackage:

- Best divers under a certain budget
- Best dress watches from the archive
- Best beginner automatic watches
- Most requested references
- Watches we wish we kept

### 15.4 Updated reruns

Old articles can be rerun if updated.

Rules:

- Update prices and availability.
- Remove sold items or mark them clearly as sold.
- Add new links.
- Add “Updated for [Month Year]” if needed.

### 15.5 Segmented reruns

Not everyone receives everything.

Examples:

- New subscribers get beginner evergreen guides.
- Seiko-tagged subscribers get Seiko archive pieces.
- Higher-budget subscribers get Swiss/luxury notes.
- Sourcing leads get sold-watch archive highlights.

---

## 16. AI Prompt Template for Draft Generation

Use structured JSON outputs so the app can safely render the newsletter.

```txt
You are the editorial and commerce assistant for The Watch Alley, a Manila-based curated watch reseller and collector desk.

Your job is to draft a newsletter issue for “The Watch List by The Watch Alley.”

Tone:
- Collector-first
- Warm but premium
- Conversational
- Not hypey
- Not generic luxury marketing
- Helpful for Filipino watch buyers

Rules:
- Do not invent product facts.
- Use only the product data provided.
- If a product is sold, clearly mark it as sold.
- Do not claim a watch is rare unless source data says so.
- Do not invent warranty, service history, condition, inclusions, or price.
- Keep each product note concise.
- Prioritize watches that create buyer action.

Return valid JSON only with this schema:

{
  "subject_options": ["", "", ""],
  "preheader_options": ["", ""],
  "issue_title": "",
  "intro": "",
  "featured_available_watches": [
    {
      "item_id": "",
      "headline": "",
      "copy": "",
      "cta_label": "View Watch"
    }
  ],
  "sold_archive_highlight": {
    "item_id": "",
    "headline": "",
    "copy": "",
    "cta_label": "Find Me Something Similar"
  },
  "collector_note": {
    "title": "",
    "body": ""
  },
  "primary_cta": {
    "label": "Browse Available Watches",
    "copy": ""
  },
  "secondary_cta": {
    "label": "Send a Sourcing Request",
    "copy": ""
  },
  "hero_image_prompt": ""
}

Input content:
{{CONTENT_PAYLOAD}}
```

---

## 17. Content Selection Logic

When generating an issue, the system should prioritize:

1. Newly added available watches
2. Available watches with strong visual appeal
3. Available watches with clear collector story
4. Watches aligned with subscriber interests
5. Sold archive pieces that create sourcing demand
6. Journal posts that educate buyers
7. Evergreen topics not used recently

Avoid:

- Featuring the same watch too often
- Featuring sold items as if available
- Featuring too many watches at once
- Sending only hard-sell emails
- Sending stale availability or outdated prices

---

## 18. Recommended MVP Build Order

### Sprint 1: Admin newsletter CRUD

- Create newsletter issue table
- Create admin list page
- Create issue editor
- Create preview page
- Add manual save/edit functionality

### Sprint 2: Watch and article linking

- Link available watches to newsletter issues
- Link sold watches to newsletter issues
- Link journal posts to newsletter issues
- Render product cards in preview

### Sprint 3: Email provider integration

- Add test email sending
- Add actual send route
- Add unsubscribe handling if not already covered by provider
- Add send logs

### Sprint 4: AI draft generation

- Add AI generation endpoint
- Add prompt template
- Save AI output as editable draft
- Log AI generation runs

### Sprint 5: Approval and scheduling

- Add status workflow
- Add approve button
- Add scheduled_at field
- Add cron send route
- Add duplicate-send prevention

### Sprint 6: Archive and repurposing

- Public archive pages
- Evergreen content library
- Welcome sequence planning
- Reuse tracking

---

## 19. Acceptance Criteria

The feature is complete when:

- Admin can manually create a newsletter issue.
- Admin can link available watches, sold watches, and journal posts.
- Admin can preview the email.
- Admin can send a test email.
- AI can generate a draft issue from live site content.
- AI output is editable before sending.
- AI-generated drafts cannot send without approval.
- Admin can approve and schedule an issue.
- Cron job can send scheduled approved issues.
- Sent issues are logged.
- Sent issues can be archived.
- Old content can be reused without duplicating stale availability claims.
- Product facts are pulled from database fields, not invented by AI.

---

## 20. AI Coding Agent Instruction

Use this prompt for Codex, Claude Code, Cursor, or a similar coding agent.

```txt
You are working on The Watch Alley website codebase.

Goal: Extend the newsletter system into an AI-assisted newsletter operations platform with human approval before sending.

First inspect the repo. Do not assume framework, file structure, auth system, database client, or styling conventions. Use existing project patterns.

Implement the system in phases if needed:

1. Add newsletter issue database tables and types.
2. Add admin newsletter CRUD pages.
3. Add issue preview rendering.
4. Add ability to link available watches, sold watches, and journal posts to newsletter issues.
5. Add test email sending through the configured email provider or prepare provider abstraction if no provider exists.
6. Add AI draft generation endpoint that uses live inventory, sold archive, journal content, and evergreen content.
7. Save AI drafts as editable issues with status `needs_review`.
8. Add AI generation logging.
9. Add approval workflow.
10. Add scheduled sending via cron route.
11. Add duplicate-send protection.
12. Add public archive route for sent issues.
13. Add documentation for required environment variables and deployment steps.

Important behavior:
- AI may draft content but may not send emails.
- Only admin-approved issues may be scheduled or sent.
- Product facts must come from database fields only.
- Do not invent watch condition, price, inclusions, authenticity, service history, movement, reference, warranty, or availability.
- Use real product images for actual watches.
- AI-generated images may only be used as editorial hero images and must require admin approval.
- Cron routes must be protected by a secret token.
- API keys must never be exposed client-side.

Newsletter status flow:
draft -> needs_review -> approved -> scheduled -> sending -> sent -> archived
Also support rejected and failed.

Suggested admin routes:
/admin/newsletters
/admin/newsletters/new
/admin/newsletters/[id]
/admin/newsletters/[id]/preview

Suggested API routes:
POST /api/newsletter/generate-draft
POST /api/newsletter/generate-section
POST /api/newsletter/send-test
POST /api/newsletter/approve
POST /api/newsletter/schedule
GET  /api/cron/newsletter-draft
GET  /api/cron/newsletter-send

Definition of done:
- A human can create, edit, preview, approve, schedule, and send a newsletter.
- AI can create draft newsletters from site content.
- No newsletter can be sent without approval.
- The cron job sends only approved scheduled issues.
- Sent newsletters are logged and archived.
- Documentation is updated.
```

---

## 21. Final Recommendation

Build this as a progressive system, not a big-bang automation.

The best first version is:

> Manual editor + linked watches + test send + approval workflow.

Then add:

> AI draft generation + cron scheduling + public archive.

This prevents overengineering and keeps the business safe while still moving toward a highly automated newsletter and collector pipeline.

