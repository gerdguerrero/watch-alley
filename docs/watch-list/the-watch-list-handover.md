# The Watch Alley Newsletter & Collector Pipeline — Handover Document

**Project codename:** The Watch List  
**Client / Brand:** The Watch Alley PH  
**Prepared for:** Project Manager, Product Owner, Developers, and AI Coding Agent  
**Prepared by:** Consultant-style product/technical handover  
**Date:** 2026-06-20  
**Target website:** https://www.thewatchalley.com/  
**Primary implementation target:** Existing The Watch Alley codebase

---

## 1. Executive Summary

The Watch Alley is currently positioned as a Manila-based curator of pre-owned and brand-new watches. The existing website already supports a strong commerce and editorial foundation through:

- Available watch inventory
- Sold Archive
- Journal / dispatch-style editorial content
- Private Collecting Desk CTA
- Messenger-based inquiry flow
- Social channels

The next strategic step is to build a **newsletter-led collector pipeline**, not merely a generic email newsletter.

The business objective is to convert casual website visitors, collectors, and social media followers into owned first-party leads. These leads can later be segmented by brand interest, price range, watch type, purchase intent, and sourcing preferences.

The recommended product is:

> **The Watch List by The Watch Alley**  
> First access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.

This should function as both:

1. A **newsletter** for editorial and trust-building content.
2. A **sales pipeline** for new arrivals, sold-watch alerts, sourcing requests, buyer profiling, and future collector services.

---

## 2. Strategic Rationale

### 2.1 Why this matters

The Watch Alley should scale from a watch reseller into a collector relationship platform.

A reseller sells inventory.

A collector platform builds:

- Trust
- Taste
- Repeat buyers
- Sourcing demand
- Brand authority
- First-party audience data
- Community
- Partnerships
- Future monetization channels

The newsletter/list is the bridge between the current website and the future business model.

### 2.2 Why this is commercially useful

Watches are high-consideration purchases. Many buyers do not purchase on the first visit. They browse, compare, wait for the right piece, and often need guidance.

A newsletter/list allows The Watch Alley to capture these users before they leave.

Potential revenue impact:

- Faster sell-through of new drops
- Higher repeat purchase rate
- More sourcing requests
- Better demand forecasting
- Better customer segmentation
- Increased trust through education
- Opportunities for future accessory sales, watch stands, storage, straps, service partners, and events

### 2.3 Core positioning

Avoid saying:

> Subscribe to our newsletter.

Say:

> Join The Watch List. Get first access to curated drops, rare finds, collector notes, and sourcing opportunities from The Watch Alley.

Core promise:

> We help collectors buy better watches before they disappear.

---

## 3. Current Website Context

### 3.1 Existing surfaces to build on

Based on current website structure, the implementation should integrate into these surfaces:

- Homepage
- Available collection page
- Individual watch/product pages, if available in the codebase
- Sold Archive
- Journal
- Private Collecting Desk section
- Footer
- Messenger inquiry CTA

### 3.2 Existing brand language

Current brand language is refined, collector-oriented, and editorial. The newsletter should keep this tone.

Relevant existing concepts:

- Curated timepieces
- In rotation, right now
- Notes from the Bench
- Dispatches on Sourcing and Craft
- Private Collecting Desk
- Ready for your next piece?
- Reference, budget, wrist size, occasion, or feeling
- Daylight-photographed, disclosed in writing, and handled with care

The newsletter should feel native to this brand, not like a generic ecommerce popup.

---

## 4. Product Vision

### 4.1 Product name

Primary name:

> **The Watch List**

Full name:

> **The Watch List by The Watch Alley**

Recurring email name:

> **The Alley Dispatch**

### 4.2 Product description

The Watch List is a collector-first email and sourcing pipeline that gives subscribers first access to curated watch drops, market notes, rare finds, sold-watch alerts, and sourcing support from The Watch Alley.

### 4.3 What users receive

Subscribers may receive:

- New arrival alerts
- Weekly or biweekly watch drops
- Curated picks by budget
- Sold Archive highlights
- Collector education
- Market observations from Manila
- Sourcing opportunities
- Partner drops
- Event invitations in the future

### 4.4 Primary CTA

> Join The Watch List

Alternative CTAs:

- Get First Access
- Notify Me of Similar Watches
- Start a Sourcing Request
- Get Collector Notes
- Receive New Drops

---

## 5. Goals and Success Metrics

### 5.1 Business goals

- Build an owned audience independent of social media algorithms.
- Convert visitors into qualified leads.
- Increase inquiries from product pages and sold-watch pages.
- Create a reusable channel for drops and sourcing campaigns.
- Support future scale into accessories, watch stands, straps, servicing, events, and collector memberships.

### 5.2 Product goals

- Add newsletter signup points across the website.
- Capture useful buyer preferences during signup.
- Store leads and preferences in a structured database.
- Allow segmentation by budget, brand, watch type, and purchase intent.
- Integrate or prepare for integration with an email sending platform.
- Track important conversion events.

### 5.3 Success metrics

MVP metrics:

- Newsletter signup conversion rate
- Number of subscribers
- Number of subscribers with preference data
- Product-page alert submissions
- Sold Archive alert submissions
- Sourcing request submissions
- Email open rate
- Email click-through rate
- Inquiry replies generated from newsletter campaigns

Suggested initial targets:

- Homepage email capture conversion: 1.5% to 3%
- Product/sold-page alert conversion: 3% to 8%
- First 90-day subscriber target: 500 to 1,500 subscribers, depending on social traffic
- Email open rate target: 35%+
- Click-through rate target: 4%+

---

## 6. Scope Overview

### 6.1 MVP scope

The MVP should include:

1. Homepage newsletter signup section
2. Dedicated `/watch-list` landing page
3. Footer newsletter signup
4. Product detail CTA: “Want one like this?”
5. Sold Archive CTA: “This piece is sold. Get notified when similar pieces arrive.”
6. Basic preference capture
7. Supabase database tables or equivalent persistence layer
8. API endpoint for newsletter signup
9. API endpoint for product/sold-watch alert
10. API endpoint for sourcing request, if not yet implemented
11. Basic validation and spam protection
12. Consent checkbox and privacy notice link
13. Analytics events
14. Admin-readable/exportable lead records

### 6.2 Phase 2 scope

After MVP:

1. Email service provider integration
2. Double opt-in flow
3. Newsletter archive page `/dispatches` or enhanced Journal integration
4. Admin dashboard for leads
5. Segmented campaign lists
6. Automated welcome email
7. Automated “sold watch similar alert” email workflow
8. Integration with product inventory tags

### 6.3 Phase 3 scope

Future growth:

1. Collector profiles
2. Private buyer desk dashboard
3. Sourcing pipeline CRM
4. Partner drops
5. Accessories: watch stands, boxes, straps, rolls
6. Events and community invitations
7. Paid collector club or early-access membership
8. Watch valuation / market observation reports

---

## 7. Non-Goals for MVP

Do not implement these in the first build unless explicitly requested:

- Full custom email campaign editor
- Full CRM replacement
- Paid membership system
- Complex automation builder
- AI-generated newsletters inside the admin panel
- Complete ecommerce checkout overhaul
- Inventory management rewrite
- Multi-language newsletter content unless the existing site already supports it cleanly
- Heavy personalization algorithm

The MVP should capture and structure demand first.

---

## 8. Recommended Information Architecture

Add the following website surfaces:

```text
/
  - Homepage newsletter section

/watch-list
  - Dedicated landing page for newsletter and collector list

/available
  - Existing collection page
  - Optional inline CTA after product grid sections

/available/[slug] or /watch/[slug]
  - Individual watch page CTA: Want one like this?

/sold
  - Sold Archive page
  - Add sold-watch alert CTA

/sold/[slug]
  - Individual sold watch page CTA: Notify me of similar pieces

/journal
  - Keep editorial content
  - Add inline newsletter CTA

/dispatches
  - Optional Phase 2 newsletter archive

/concierge or /sourcing
  - Dedicated sourcing request page, if not yet present
```

---

## 9. User Personas

### 9.1 First-time buyer

Needs guidance, reassurance, and budget-based recommendations.

Likely questions:

- What is a good first watch?
- Is pre-owned safe?
- What fits my wrist?
- Is this worth the price?

Newsletter value:

- Education
- Budget picks
- Trust-building stories
- Clear buying advice

### 9.2 Enthusiast collector

Already knows references and brands. Wants fast access to good inventory.

Likely needs:

- New drops
- Rare finds
- JDM pieces
- Sold-price context
- Similar-watch alerts

Newsletter value:

- First access
- Better curation
- Market notes
- Sourcing support

### 9.3 Gift buyer

Buying for a partner, family member, milestone, or occasion.

Likely needs:

- Simple recommendations
- Budget guidance
- Style matching
- Confidence in authenticity and condition

Newsletter value:

- Occasion-based guides
- Concierge CTA
- “Tell us the feeling you want” framing

### 9.4 Future high-value buyer

Not ready now, but may later buy luxury or multiple watches.

Newsletter value:

- Relationship building
- Long-term trust
- Preference tracking
- Private sourcing

---

## 10. User Flows

### 10.1 Homepage signup flow

1. User lands on homepage.
2. User sees “Join The Watch List” section.
3. User enters email and optional preferences.
4. User checks consent checkbox.
5. User submits form.
6. System validates data.
7. System stores subscriber record.
8. System stores preference tags.
9. System displays success message.
10. Optional Phase 2: system sends welcome/confirmation email.

Success message:

> You are on The Watch List. We will send curated drops, collector notes, and worthwhile finds only.

### 10.2 Sold watch alert flow

1. User views Sold Archive or sold watch detail page.
2. User sees CTA: “This piece is sold. Want one like this?”
3. User enters email and optional budget/timeline.
4. System captures watch reference/slug as interest context.
5. System stores alert request.
6. Optional: system also adds user to newsletter subscribers.
7. User receives success message.

Success message:

> Got it. We will keep an eye out for similar pieces and send relevant finds.

### 10.3 Product page alert flow

1. User views an available watch but may not inquire immediately.
2. User sees secondary CTA: “Want similar drops?”
3. User enters email.
4. System stores product interest and tags.
5. Optional: user can select similar brands/types.

### 10.4 Sourcing request flow

1. User goes to `/sourcing`, `/concierge`, or Private Collecting Desk CTA.
2. User submits reference, budget, wrist size, timeline, and preferences.
3. System stores request.
4. System optionally sends internal notification to the team.
5. User gets confirmation.

Success message:

> Your sourcing request has been received. The Watch Alley team will review the details and reach out if there is a good fit.

---

## 11. Functional Requirements

### FR-001 Newsletter signup form

The site shall provide a newsletter signup form on the homepage.

Fields:

- Email, required
- First name, optional
- Budget range, optional
- Interested brands, optional
- Watch type/style, optional
- Consent checkbox, required

### FR-002 Dedicated Watch List page

The site shall include a dedicated landing page at `/watch-list`.

Page objective:

- Explain the value of joining The Watch List
- Capture email and preferences
- Set expectations on email frequency/content
- Link to Privacy Policy

### FR-003 Footer signup

The site shall include a compact email signup form in the footer.

Fields:

- Email, required
- Consent text or link to terms/privacy

### FR-004 Product interest capture

The site shall allow users to submit interest in similar watches from product detail pages.

The system should capture:

- Email
- Product ID or slug
- Product brand
- Product model/reference, if available
- Product status: available or sold
- Optional budget
- Optional notes

### FR-005 Sold-watch alert

Sold Archive pages shall include a CTA to get notified when similar pieces arrive.

CTA copy:

> This piece is sold. Want one like this?

### FR-006 Sourcing request form

The site shall provide a structured sourcing request form.

Fields:

- Name
- Email
- Phone / Messenger / Instagram handle, optional
- Desired watch/reference
- Budget range
- Condition preference
- Timeline
- Wrist size, optional
- Occasion, optional
- Notes
- Consent checkbox

### FR-007 Duplicate handling

If an email already exists, the system should update preferences instead of creating duplicate subscriber records.

Suggested behavior:

- Normalize email to lowercase.
- If email exists, update `updated_at` and merge tags/preferences.
- Store separate interest events for each product/sold watch alert.

### FR-008 Consent capture

The system shall capture explicit consent metadata.

Store:

- Consent status
- Consent text/version
- Timestamp
- Source page
- IP address if already available through existing server logs or request context
- User agent, optional

### FR-009 Analytics events

The site shall fire analytics events for conversion tracking.

Suggested events:

- `newsletter_signup_viewed`
- `newsletter_signup_started`
- `newsletter_signup_submitted`
- `newsletter_signup_succeeded`
- `newsletter_signup_failed`
- `watch_alert_submitted`
- `sourcing_request_submitted`
- `watch_list_page_viewed`

### FR-010 Admin/export access

For MVP, admin access may be a Supabase table view, CSV export, or protected route.

Minimum useful export columns:

- Email
- Name
- Source
- Budget range
- Brand interests
- Watch type interests
- Purchase intent
- Created date
- Last updated date
- Product/watch interest
- Notes

---

## 12. Non-Functional Requirements

### 12.1 Performance

- Forms should not block initial page rendering.
- Use lazy loading where appropriate.
- Avoid large third-party scripts unless necessary.

### 12.2 Accessibility

- Forms must have labels.
- Buttons must be keyboard accessible.
- Error states must be screen-reader friendly.
- Contrast must be readable.

### 12.3 Mobile-first design

Most traffic may come from Instagram, Facebook, TikTok, and Messenger. Signup forms must be optimized for mobile.

### 12.4 Data privacy

The implementation must include:

- Clear purpose for data collection
- Consent checkbox where appropriate
- Link to Privacy Policy
- Easy unsubscribe mechanism once emails are sent
- Data export/deletion capability as a later admin process

This is not legal advice. The team should review compliance with the Philippine Data Privacy Act, National Privacy Commission guidance, and any email platform requirements.

### 12.5 Security

- Validate all inputs server-side.
- Rate-limit API endpoints.
- Sanitize free-text fields.
- Do not expose Supabase service role keys to the browser.
- Use environment variables for API keys.
- Add spam protection or honeypot.

### 12.6 Reliability

- Failed submissions should show a clear error message.
- Duplicate submissions should not break the user experience.
- API errors should be logged server-side.

---

## 13. Suggested Data Model

Assume Supabase/Postgres unless repo shows a different backend.

### 13.1 `newsletter_subscribers`

```sql
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  status text not null default 'active',
  source text,
  source_page text,
  consent_given boolean not null default false,
  consent_text_version text,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Suggested `status` values:

- `active`
- `pending_confirmation`
- `unsubscribed`
- `bounced`

### 13.2 `subscriber_preferences`

```sql
create table if not exists subscriber_preferences (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references newsletter_subscribers(id) on delete cascade,
  budget_range text,
  brand_interests text[] default '{}',
  style_interests text[] default '{}',
  purchase_intent text,
  wrist_size text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Suggested `budget_range` values:

- `under_10000`
- `10000_20000`
- `20000_50000`
- `50000_100000`
- `100000_plus`
- `not_sure`

Suggested `style_interests`:

- `diver`
- `dress`
- `field`
- `gmt`
- `chronograph`
- `digital`
- `jdm`
- `limited_edition`
- `ladies`
- `daily_beater`
- `gift`

Suggested `purchase_intent`:

- `just_browsing`
- `buying_soon`
- `actively_searching`
- `gift_shopping`
- `collector`

### 13.3 `watch_interest_alerts`

```sql
create table if not exists watch_interest_alerts (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references newsletter_subscribers(id) on delete set null,
  email text not null,
  source_page text,
  watch_id text,
  watch_slug text,
  watch_brand text,
  watch_model text,
  watch_reference text,
  watch_status text,
  desired_budget_range text,
  notes text,
  created_at timestamptz not null default now()
);
```

### 13.4 `sourcing_requests`

```sql
create table if not exists sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references newsletter_subscribers(id) on delete set null,
  name text,
  email text not null,
  phone text,
  instagram_handle text,
  messenger_contact text,
  desired_watch text,
  desired_brand text,
  desired_reference text,
  budget_range text,
  condition_preference text,
  timeline text,
  wrist_size text,
  occasion text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Suggested `status` values:

- `new`
- `reviewing`
- `contacted`
- `sourcing`
- `matched`
- `closed_won`
- `closed_lost`

### 13.5 `newsletter_events`

Optional for MVP, useful for audit and analytics.

```sql
create table if not exists newsletter_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references newsletter_subscribers(id) on delete set null,
  email text,
  event_type text not null,
  source_page text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
```

---

## 14. API Requirements

Adapt endpoint paths based on the actual framework.

### 14.1 `POST /api/newsletter/subscribe`

Purpose:

Create or update newsletter subscriber.

Request body:

```json
{
  "email": "buyer@example.com",
  "firstName": "Viron",
  "budgetRange": "20000_50000",
  "brandInterests": ["Seiko", "Casio", "Orient"],
  "styleInterests": ["diver", "jdm"],
  "purchaseIntent": "buying_soon",
  "wristSize": "6.5 in",
  "source": "homepage_watch_list",
  "sourcePage": "/",
  "consentGiven": true,
  "consentTextVersion": "watch-list-consent-v1"
}
```

Success response:

```json
{
  "ok": true,
  "message": "You are on The Watch List."
}
```

Validation:

- Email must be valid.
- Consent must be true.
- Arrays should be limited to approved values where possible.
- Free-text fields should have length limits.

### 14.2 `POST /api/watch-alerts`

Purpose:

Capture interest in a specific available or sold watch.

Request body:

```json
{
  "email": "buyer@example.com",
  "watchId": "optional-id",
  "watchSlug": "seiko-5-sports-gmt-luzon",
  "watchBrand": "Seiko",
  "watchModel": "Seiko 5 Sports GMT",
  "watchReference": "optional-reference",
  "watchStatus": "sold",
  "desiredBudgetRange": "20000_50000",
  "notes": "Interested in similar Philippine limited editions.",
  "sourcePage": "/sold/seiko-5-sports-gmt-luzon",
  "consentGiven": true
}
```

Success response:

```json
{
  "ok": true,
  "message": "We will keep an eye out for similar pieces."
}
```

### 14.3 `POST /api/sourcing-requests`

Purpose:

Capture Private Collecting Desk / sourcing request.

Request body:

```json
{
  "name": "Viron",
  "email": "buyer@example.com",
  "phone": "",
  "instagramHandle": "",
  "messengerContact": "",
  "desiredWatch": "Seiko Alpinist",
  "desiredBrand": "Seiko",
  "desiredReference": "SARB017 or similar",
  "budgetRange": "20000_50000",
  "conditionPreference": "Pre-owned okay",
  "timeline": "Within 30 days",
  "wristSize": "6.5 in",
  "occasion": "Daily watch",
  "notes": "Prefer green dial.",
  "sourcePage": "/sourcing",
  "consentGiven": true
}
```

---

## 15. UI Components to Build

### 15.1 `NewsletterSignupForm`

Reusable form component.

Props:

```ts
type NewsletterSignupFormProps = {
  variant?: 'homepage' | 'footer' | 'journal' | 'watchListPage' | 'modal';
  source: string;
  compact?: boolean;
  showPreferences?: boolean;
};
```

### 15.2 `WatchInterestForm`

Used on available/sold product pages.

Props:

```ts
type WatchInterestFormProps = {
  watchId?: string;
  watchSlug?: string;
  brand?: string;
  model?: string;
  reference?: string;
  status: 'available' | 'sold';
};
```

### 15.3 `SourcingRequestForm`

Used on Private Collecting Desk page or section.

Props:

```ts
type SourcingRequestFormProps = {
  source?: string;
  prefilledWatch?: string;
  prefilledBrand?: string;
  prefilledReference?: string;
};
```

### 15.4 `WatchListCTA`

Small CTA block reusable across Journal, Available, Sold, and footer.

Suggested variants:

- Editorial CTA
- Product CTA
- Sold Archive CTA
- Footer CTA

---

## 16. Suggested Copy

### 16.1 Homepage section

Headline:

> Join The Watch List

Subheadline:

> First access to curated drops, rare finds, collector notes, and sourcing opportunities from The Watch Alley.

Body:

> Good pieces move quickly. Join The Watch List and we will send worthwhile arrivals, market notes, and collector picks before they disappear.

CTA:

> Join The Watch List

Small trust line:

> No spam. Just curated watches, useful notes, and first looks.

### 16.2 `/watch-list` page hero

Headline:

> The better way to find your next watch.

Subheadline:

> Join The Watch List for first access to curated timepieces, rare finds, sold-watch alerts, and collector notes from Manila.

CTA:

> Get First Access

### 16.3 Sold Archive CTA

Headline:

> Missed this piece?

Body:

> This watch is already sold, but we can keep an eye out for similar references, sizes, and budgets.

CTA:

> Notify Me of Similar Watches

### 16.4 Product page CTA

Headline:

> Want similar drops?

Body:

> Join The Watch List and get notified when similar pieces arrive.

CTA:

> Alert Me

### 16.5 Journal CTA

Headline:

> Collector notes, straight from The Alley.

Body:

> Get new dispatches, market observations, and curated drops in your inbox.

CTA:

> Join The Watch List

### 16.6 Form success states

Newsletter success:

> You are on The Watch List. We will send curated drops, collector notes, and worthwhile finds only.

Watch alert success:

> Got it. We will keep an eye out for similar pieces and send relevant finds.

Sourcing request success:

> Your sourcing request has been received. The Watch Alley team will review the details and reach out if there is a good fit.

### 16.7 Consent copy

> I agree to receive curated watch drops, collector notes, and sourcing updates from The Watch Alley. I understand I can unsubscribe anytime.

---

## 17. Email Content Strategy

### 17.1 Recommended recurring format

Email title:

> The Alley Dispatch

Suggested frequency:

- Weekly if inventory updates frequently
- Biweekly if inventory is slower
- Special drops as needed

### 17.2 Standard email structure

1. Opening note
2. This week’s drops
3. Best pick by budget
4. Sold Archive highlight
5. Collector note
6. Sourcing CTA

### 17.3 Example issue outline

Subject:

> New in The Alley: JDM Seikos, daily beaters, and one sold piece worth remembering

Sections:

- From The Alley
- New Arrivals
- Pick Under ₱20K
- From the Sold Archive
- Collector Note: Why case size is not the whole story
- Looking for something specific?

### 17.4 Content sources

The newsletter can pull from:

- Current available inventory
- Recently sold watches
- Journal articles
- New product drops
- Sourcing trends
- Watch care tips
- Brand education
- Price range recommendations

---

## 18. Email Platform Options

The implementation should keep the website database as the source of truth where possible.

### Option A: Supabase + Resend

Best for developer control.

Pros:

- Custom data model
- Works well with Vercel/serverless
- Good transactional emails
- Easy to build custom workflows

Cons:

- Requires custom admin/campaign tooling
- More engineering work for newsletters

### Option B: Beehiiv

Best if The Watch Alley wants to become a media/newsletter brand.

Pros:

- Great publication experience
- Growth tools
- Newsletter archive
- Referral features

Cons:

- Less custom commerce segmentation unless integrated carefully

### Option C: Klaviyo

Best if The Watch Alley becomes more ecommerce-heavy.

Pros:

- Strong segmentation
- Commerce automations
- Lifecycle marketing

Cons:

- More expensive/complex than needed for early MVP

### Option D: Mailchimp / Brevo

Best for fast simple launch.

Pros:

- Easy campaign sending
- Familiar UI
- Good enough for MVP

Cons:

- May become limiting as custom buyer profiles grow

### Recommended approach

MVP:

> Supabase as lead database + manual export or simple webhook integration.

Phase 2:

> Sync subscribers to Beehiiv, Klaviyo, Brevo, or Resend-based campaign system depending on business direction.

---

## 19. Technical Implementation Notes for AI Coding Agent

### 19.1 First step

Inspect the repository before implementation.

Determine:

- Framework
- Routing approach
- Existing database layer
- Existing Supabase client, if any
- Existing product/watch data model
- Existing form components
- Existing styling conventions
- Existing analytics setup
- Existing environment variable pattern

Do not assume file paths until repository is inspected.

### 19.2 Expected stack assumption

Assume the site may be built with a modern Vercel-compatible frontend and Supabase or similar backend. If the actual codebase differs, adapt the implementation to the existing stack.

### 19.3 Development principles

- Reuse existing design tokens/components.
- Keep the brand tone refined and editorial.
- Avoid generic ecommerce newsletter popup design.
- Build reusable forms and CTA components.
- Use server-side API routes for writes.
- Keep Supabase service keys server-only.
- Add validation schemas if the project already uses Zod/Yup/Valibot.
- Add minimal tests where the repo already supports testing.
- Avoid introducing unnecessary dependencies.

### 19.4 Suggested implementation order

1. Inspect repo and identify framework/database setup.
2. Create database migration files for subscriber-related tables.
3. Build server-side API endpoints.
4. Build reusable form components.
5. Add homepage newsletter section.
6. Add `/watch-list` landing page.
7. Add footer signup.
8. Add CTA to Journal.
9. Add sold/product alert form to relevant pages.
10. Add sourcing request form/page if not already present.
11. Add analytics events.
12. Add validation, spam protection, and error handling.
13. Test mobile layout.
14. Test duplicate email behavior.
15. Document environment variables and deployment steps.

---

## 20. Acceptance Criteria

### 20.1 Newsletter signup

- User can submit valid email from homepage.
- User cannot submit invalid email.
- User cannot submit without required consent.
- Successful submission appears in database.
- Duplicate email updates existing subscriber instead of creating duplicate row.
- User sees success message.
- User sees helpful error message if submission fails.

### 20.2 Watch List landing page

- `/watch-list` exists.
- Page uses The Watch Alley visual style.
- Page explains the value clearly.
- Page includes full signup form.
- Page is responsive.
- Page includes privacy/consent language.

### 20.3 Sold/product alert

- Sold watch pages or sold archive items include alert CTA.
- Alert submission stores watch context.
- User receives success state.
- Alert also creates or updates subscriber record if appropriate.

### 20.4 Sourcing request

- User can submit sourcing request.
- Request appears in database.
- Required fields are validated.
- Free-text fields are sanitized/length-limited.

### 20.5 Analytics

- Signup and alert conversion events are fired.
- Events include source/variant where appropriate.

### 20.6 Security and privacy

- No secret keys are exposed client-side.
- API routes validate inputs server-side.
- Basic spam protection is present.
- Consent metadata is stored.

---

## 21. QA Checklist

### Functional QA

- [ ] Homepage signup works
- [ ] Footer signup works
- [ ] `/watch-list` signup works
- [ ] Sold watch alert works
- [ ] Product watch alert works
- [ ] Sourcing request works
- [ ] Duplicate email handling works
- [ ] Invalid email blocked
- [ ] Missing consent blocked
- [ ] API error displayed gracefully

### Responsive QA

- [ ] iPhone viewport
- [ ] Android viewport
- [ ] Tablet viewport
- [ ] Desktop viewport
- [ ] Long email address handling
- [ ] Multi-select preference layout

### Data QA

- [ ] Subscriber created
- [ ] Preferences stored
- [ ] Alert stored with product context
- [ ] Sourcing request stored
- [ ] Consent metadata stored
- [ ] Timestamps correct

### Security QA

- [ ] Server-side validation present
- [ ] Service role key not exposed
- [ ] Honeypot or rate-limit present
- [ ] Free-text fields length-limited
- [ ] Error logs do not expose secrets

---

## 22. Environment Variables

Names may vary depending on repo conventions.

Suggested variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEWSLETTER_FROM_EMAIL=
NEWSLETTER_ADMIN_EMAIL=
```

Only expose public keys using `NEXT_PUBLIC_` or equivalent frontend-safe convention.

---

## 23. Open Questions for Product Owner

These do not block MVP, but should be clarified:

1. Should The Watch List use double opt-in immediately?
2. Which email platform should be used first: Beehiiv, Brevo, Mailchimp, Klaviyo, Resend, or manual export?
3. Should subscribers be automatically added when they submit a sourcing request?
4. Should the first email be manually written or automated?
5. Should the team receive email/Slack notifications for sourcing requests?
6. Should `/dispatches` be separate from `/journal`, or should Journal serve as the newsletter archive?
7. Should the newsletter be English-only, Filipino-friendly, or bilingual?
8. Should “WatchAli” be used anywhere, or should all branding remain “The Watch Alley”?

Recommended default decisions:

- Use “The Watch Alley” publicly.
- Use “The Watch List” for the newsletter/product.
- Start with explicit opt-in consent.
- Store leads in Supabase first.
- Add email platform sync in Phase 2.

---

## 24. Backlog User Stories

### Epic 1: Newsletter Capture

#### Story 1.1 Homepage Watch List signup

As a website visitor, I want to join The Watch List from the homepage so I can receive curated drops and collector notes.

Acceptance criteria:

- Signup form appears on homepage.
- Email is required.
- Consent is required.
- Preferences are optional.
- Submission stores data.
- Success and error states are shown.

#### Story 1.2 Footer compact signup

As a website visitor, I want to subscribe from the footer without leaving the page.

Acceptance criteria:

- Footer form accepts email.
- Submission stores source as `footer`.
- Success state appears inline.

#### Story 1.3 Watch List landing page

As a prospective buyer, I want a dedicated page explaining why I should join The Watch List.

Acceptance criteria:

- `/watch-list` exists.
- Page includes hero copy, benefit sections, and signup form.
- Page follows existing brand design.

### Epic 2: Watch Interest Alerts

#### Story 2.1 Sold watch alert

As a collector, I want to be notified when similar pieces arrive after viewing a sold watch.

Acceptance criteria:

- Sold watch CTA appears.
- Form captures email and watch context.
- Alert is stored.

#### Story 2.2 Available watch similar alert

As a browsing buyer, I want alerts for similar watches even if I do not inquire now.

Acceptance criteria:

- Product page includes secondary CTA.
- Submission captures product context.

### Epic 3: Sourcing Requests

#### Story 3.1 Sourcing form

As a buyer, I want to tell The Watch Alley what I am looking for so they can help source the right watch.

Acceptance criteria:

- Form captures reference, budget, condition, timeline, and contact info.
- Request is stored.
- User receives confirmation.

### Epic 4: Admin and Operations

#### Story 4.1 Lead export

As the business owner, I want to export subscriber and sourcing data so I can follow up and send campaigns.

Acceptance criteria:

- Data is stored cleanly.
- Tables can be exported from Supabase or admin route.
- Preferences are readable.

### Epic 5: Analytics

#### Story 5.1 Signup conversion tracking

As the business owner, I want to know which pages generate subscribers.

Acceptance criteria:

- Source page is stored.
- Analytics event fires on successful signup.

---

## 25. Recommended MVP Ticket Breakdown

### Ticket 1: Repo audit and implementation plan

- Inspect stack
- Identify routing and data access patterns
- Confirm product/sold page data structure
- Return short implementation notes before coding

### Ticket 2: Database migration

- Add newsletter tables
- Add sourcing request table if absent
- Add indexes on email, created_at, source

### Ticket 3: Newsletter API

- Implement `POST /api/newsletter/subscribe`
- Add validation
- Add duplicate email handling
- Add consent storage

### Ticket 4: Watch alert API

- Implement `POST /api/watch-alerts`
- Store watch context
- Link to subscriber if possible

### Ticket 5: Sourcing request API

- Implement or update sourcing request endpoint
- Store structured request
- Optional internal notification stub

### Ticket 6: Reusable form components

- `NewsletterSignupForm`
- `WatchInterestForm`
- `SourcingRequestForm`
- Shared validation UI

### Ticket 7: Homepage integration

- Add Watch List section
- Ensure mobile layout
- Add analytics event

### Ticket 8: `/watch-list` landing page

- Build page
- Add full form
- Add benefits and copy

### Ticket 9: Sold/Product page integration

- Add alert CTA to sold pages
- Add secondary alert CTA to product pages where possible

### Ticket 10: Footer and Journal CTA

- Add compact footer signup
- Add Journal inline CTA

### Ticket 11: QA and documentation

- Test flows
- Add README notes
- Document env variables
- Confirm deployment readiness

---

## 26. AI Coding Agent Prompt

Use this prompt when handing the project to Codex, Claude Code, Cursor, or another coding agent.

```text
You are working on The Watch Alley website codebase.

Goal: Implement “The Watch List by The Watch Alley,” a newsletter-led collector pipeline for capturing subscribers, watch preferences, sold-watch alerts, and sourcing requests.

Start by inspecting the repository. Do not assume the framework, file paths, database setup, or component structure until inspected. After inspection, implement using the project’s existing conventions.

Business context:
The Watch Alley is a Manila-based watch reseller/curator with available inventory, sold archive, journal/editorial content, and a Private Collecting Desk CTA. The new feature should not feel like a generic newsletter popup. It should feel like a collector-first first-access list.

Public positioning:
“The Watch List by The Watch Alley — First access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.”

MVP requirements:
1. Add homepage newsletter signup section.
2. Add dedicated /watch-list landing page.
3. Add footer compact signup.
4. Add product/sold watch alert CTA if relevant page templates exist.
5. Add or improve sourcing request form/page if relevant.
6. Persist subscriber, preference, watch alert, and sourcing request data.
7. Add API endpoints for signup, watch alerts, and sourcing requests.
8. Include validation, duplicate-email handling, consent capture, and basic spam protection.
9. Use server-side routes for database writes.
10. Do not expose secret keys client-side.
11. Follow existing visual style and component conventions.
12. Add basic analytics events or source tracking if analytics exists.
13. Document env variables and deployment notes.

Important copy:
Primary CTA: “Join The Watch List”
Homepage subheadline: “First access to curated drops, rare finds, collector notes, and sourcing opportunities from The Watch Alley.”
Sold-watch CTA: “This piece is sold. Want one like this?”
Consent copy: “I agree to receive curated watch drops, collector notes, and sourcing updates from The Watch Alley. I understand I can unsubscribe anytime.”

Database assumption:
If Supabase/Postgres is used, create or adapt tables for newsletter_subscribers, subscriber_preferences, watch_interest_alerts, sourcing_requests, and optionally newsletter_events. If a different backend exists, adapt the data model accordingly.

Definition of done:
- Signup works on homepage, footer, and /watch-list.
- Sold/product alert submissions store watch context.
- Sourcing request form stores structured data.
- Duplicate emails are handled gracefully.
- Consent metadata is stored.
- Invalid inputs are blocked.
- Mobile layout is polished.
- Documentation is updated.
```

---

## 27. Recommended Launch Plan

### Week 1: Build MVP

- Database tables
- API endpoints
- Forms
- Homepage section
- Watch List page
- Footer signup
- Basic QA

### Week 2: Lead capture expansion

- Sold Archive CTAs
- Product page CTAs
- Journal CTA
- Sourcing form
- Analytics events

### Week 3: First campaign

- Export first subscribers
- Send first Alley Dispatch manually or via selected platform
- Track clicks and inquiries
- Refine segmentation

### Week 4: Automation and optimization

- Welcome email
- Email platform sync
- Admin workflow
- A/B test CTA copy
- Add more segmentation

---

## 28. First Newsletter Issue Suggestion

Issue name:

> The Alley Dispatch #001

Subject options:

1. You are on The Watch List
2. New from The Alley: curated drops and collector notes
3. First looks from The Watch Alley
4. A better way to find your next watch

Structure:

1. Welcome note
2. 3 available pieces
3. 1 best pick by budget
4. 1 sold archive highlight
5. 1 collector note
6. Sourcing CTA

CTA:

> Looking for something specific? Tell us the reference, budget, wrist size, or the feeling you want from the watch.

---

## 29. Final Recommendation

Proceed with the MVP.

The newsletter should be treated as an owned audience and collector-intelligence system, not a simple email blast.

The most important implementation principle:

> Capture demand wherever it appears: homepage, product pages, sold archive, journal, and private collecting desk.

This creates a scalable foundation for The Watch Alley to move from reseller into collector platform, sourcing desk, editorial brand, and eventually a broader watch-lifestyle business.
