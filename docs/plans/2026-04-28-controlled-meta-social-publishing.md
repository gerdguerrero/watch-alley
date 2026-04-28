# The Watch Alley Controlled Meta Social Publishing Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add safe, owner-friendly Facebook Page and Instagram publishing from The Watch Alley admin when a watch listing is ready to promote.

**Architecture:** Supabase remains the source of truth for inventory and publishing state. The admin UI generates an editable social post preview from a watch listing, then calls secure Supabase Edge Functions that talk to the Meta Graph API. Meta tokens, app secrets, and page access tokens never enter browser code.

**Tech Stack:** Supabase Postgres/RPCs, Supabase Edge Functions, Meta Graph API, Facebook Page publishing API, Instagram Content Publishing API, vanilla JavaScript admin UI, existing validation scripts.

---

## Executive recommendation

Do **not** blindly auto-post on every Save.

For a premium watch retailer, the mature workflow is controlled publishing:

1. Save Draft.
2. Publish / Update Published Listing on the website.
3. Generate Facebook and Instagram post previews.
4. Let the owner edit captions and confirm.
5. Post to Facebook and/or Instagram.
6. Store the published URLs, timestamps, and errors in Supabase.

Reason: The Watch Alley sells high-ticket items where wrong price, wrong condition text, wrong image, or wrong availability status can damage trust. Automation should reduce work, not remove human judgment.

## Product behavior

Inside `/admin`, each published watch should eventually expose a Social Publishing panel:

- Generate Facebook caption.
- Generate Instagram caption.
- Preview selected image/carousel.
- Edit caption before posting.
- Post to Facebook Page.
- Post to Instagram Professional account.
- Show posted URL after success.
- Prevent duplicate accidental reposts.
- Allow an intentional repost only with clear confirmation.
- Show retryable error state if Meta rejects a post.

Optional later setting:

- “When publishing a watch, create social post drafts automatically.”

Avoid this wording/behavior:

- “Automatically post every saved draft.”
- “Post without preview.”
- “Enter Facebook/Instagram password.”
- Any browser-stored Meta secret or access token.

## External account requirements

Before implementation, confirm:

- Facebook asset is a Page, not a personal profile.
- Instagram account is Professional: Business or Creator.
- Instagram account is connected to the Facebook Page.
- A Meta Business / Developer app can request the needed permissions.
- Page Publishing Authorization is complete if Meta requires it.
- The Watch Alley privacy policy and terms are acceptable for Meta App Review.
- Product images used for Instagram publishing are publicly reachable over HTTPS and in a Meta-supported format. If current source images are PNG/WebP, add a media-prep step that provides JPEG publish URLs.

Expected Meta permissions, subject to current Meta policy/app-review rules:

- Facebook Page posting: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
- Instagram publishing: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` or the newer Instagram Business equivalents required by Meta.

## Data model foundation

### Task 1: Add social publishing tables

**Objective:** Store account connection state, draft state, publish attempts, post URLs, and errors without relying on browser memory.

**Files:**

- Create migration under `docs/migrations/` or Supabase migration path used by the repo.
- Update `docs/inventory-schema.md` with social publishing notes.

**Tables / concepts:**

- `watch_alley.social_accounts`
  - provider: `facebook` / `instagram`
  - page/account id
  - display name / handle
  - connected_by
  - connected_at
  - token reference metadata only; never expose token values publicly
- `watch_alley.social_posts`
  - watch_id
  - platform
  - status: `draft`, `queued`, `publishing`, `published`, `failed`, `skipped`
  - caption
  - media URLs
  - external post id
  - external post URL
  - published_at
  - error_code / error_message
  - created_by / approved_by

**Verification:**

- RLS enabled.
- Admin-only RPCs gate on `is_admin()`.
- No public read of token-bearing tables.
- No service-role secrets in SQL docs.
- Duplicate prevention is enforced at the database/function layer with an idempotency key or unique constraint per watch/platform unless an admin explicitly confirms a repost.

### Task 2: Add caption generation RPC/helper

**Objective:** Generate a clean default caption from existing watch fields without calling Meta.

**Inputs:**

- brand
- model
- reference
- condition
- price
- box/papers
- availability/status
- share URL

**Output examples:**

Facebook style:

```text
New arrival at The Watch Alley: Seiko Presage Cocktail Time.

Condition: Excellent pre-owned
Includes: Box and papers
Price: ₱38,000

View details or inquire: https://thewatchalley.com/#/watch/<slug>
```

Instagram style:

```text
New arrival: Seiko Presage Cocktail Time.

Excellent pre-owned condition. Box and papers included.
DM The Watch Alley to inquire.

#TheWatchAlley #WatchPH #SeikoPH #PreOwnedWatchesPH
```

**Verification:**

- Escapes user-controlled listing fields before rendering in admin.
- Captions are editable before posting.
- Caption generation does not require Meta credentials.

## Secure Meta integration

### Task 3: Build Meta connection flow

**Objective:** Let an admin connect The Watch Alley’s Facebook Page / Instagram Professional account via OAuth or a secure server-side setup flow.

**Files:**

- Supabase Edge Function: `meta-connect` or equivalent.
- Admin UI Social settings section.
- Deployment docs for required environment variables.

**Security rules:**

- No Facebook/Instagram passwords.
- No Meta app secret in browser code.
- No long-lived access token in `index.html`, `admin/index.html`, or `scripts/admin.js`.
- Store Meta tokens only in Supabase Edge Function secrets, Supabase Vault, or encrypted server-side-only storage; never in raw readable public/browser-accessible columns.
- Edge Function validates the caller is an admin before any Meta action.
- Token refresh/rotation is handled server-side.

**Verification:**

- Static scan finds no Meta token/app secret in committed files.
- Non-admin user cannot connect, publish, or read account token metadata.

### Task 4: Add Facebook Page publishing

**Objective:** Publish a confirmed watch post to the connected Facebook Page.

**Flow:**

1. Admin selects a published watch.
2. Admin opens Social Publishing preview.
3. Admin edits/approves Facebook caption.
4. Admin clicks Post to Facebook.
5. Edge Function validates admin + watch status.
6. Edge Function publishes through Graph API.
7. Supabase stores external post id, URL, timestamp, and status.

**Verification:**

- Prevents duplicate posts for same watch/platform unless admin confirms repost.
- Failed post stores retryable error details.
- Published Facebook post URL appears in admin.

### Task 5: Add Instagram publishing

**Objective:** Publish a confirmed watch image/carousel post to the connected Instagram Professional account.

**Flow:**

1. Create media container for one image or carousel items.
2. Poll/check container status when required.
3. Publish media container.
4. Store external media id / URL / timestamp.

**Important constraints:**

- Instagram publishing requires a Professional account connected to a Facebook Page.
- Media URL must be public and Meta-fetchable.
- Instagram has daily publishing limits; enforce a conservative guard in admin.
- Carousels have media count/format constraints; validate before calling Meta.

**Verification:**

- Admin sees clear format errors before attempting publish.
- Rate-limit warning is visible before hitting Meta failure.
- Published Instagram URL appears in admin.

## Admin UX implementation

### Task 6: Add Social Publishing panel in `/admin`

**Objective:** Make the automation owner-friendly and non-technical.

**UI copy style:**

- “Generate social post”
- “Preview Facebook post”
- “Preview Instagram post”
- “Post to Facebook”
- “Post to Instagram”
- “Posted successfully”
- “Needs attention”
- “Retry”

Avoid developer/platform jargon in normal owner workflow:

- no access-token wording in the main workflow
- no API endpoint wording
- no Graph API errors unless shown inside a support/debug drawer

**Verification:**

- Browser QA confirms the panel is clear to a non-technical owner.
- Admin copy validator blocks password/token/API-secret instructions from appearing in the owner-facing flow.

### Task 7: Add audit trail and reporting

**Objective:** Connect social posts to business outcomes.

Track:

- watch id / slug
- platform
- caption used
- posted URL
- published_at
- admin who approved
- clicks/inquiries attributed to social source when available

Future metric:

- inquiry-to-sale conversion by source: website, Facebook, Instagram, Viber, referral.

## Rollout plan

### Phase A: Preview-only MVP

- Generate Facebook/Instagram captions inside admin.
- Store social draft state in Supabase.
- No Meta API posting yet.
- Owner can copy/paste manually.

This gives immediate value with almost zero platform risk.

### Phase B: Facebook Page posting

- Add Meta server-side connection.
- Add Post to Facebook button.
- Store Facebook post URL.

Facebook is usually simpler than Instagram and validates the auth/account model first.

### Phase C: Instagram publishing

- Add image format validation/media preparation.
- Add Instagram post/carousel publishing.
- Add rate-limit/status handling.

### Phase D: Controlled automation

- Add optional setting: auto-create social drafts when a watch becomes published.
- Keep explicit human approval before public posting.

## Definition of done

- Admin can generate editable social captions from a watch listing.
- Admin can explicitly post to Facebook Page and Instagram Professional account.
- Browser code contains no Meta secrets/tokens.
- Duplicate posting is prevented by default.
- Published post URLs are stored and visible in admin.
- Failed publish attempts are visible, retryable, and logged.
- Tests/build/static scan pass.
- Browser QA confirms the workflow is non-technical and client-owner-friendly.

## Open questions before build

- What is the Facebook Page URL/name?
- What is the Instagram handle?
- Is the Instagram account Business/Creator and linked to the Facebook Page?
- Who owns the Meta Business account and can grant app access?
- Should The Watch Alley start with preview-only drafts while Meta review is in progress?
- Should the default CTA be “DM to inquire,” website link, Messenger, Viber, or a combination?
- Are hashtags fixed globally or generated per brand/reference?
