# The Watch List

**Feature name:** The Watch List by The Watch Alley  
**Current branch scope:** Collector signup, preference capture, sold-watch alerts, sourcing requests, and hardened newsletter operations.  
**Status:** Production hardening in progress; sends still require admin approval and provider configuration.

The Watch List is the newsletter-led collector pipeline for The Watch Alley. It is positioned as first access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.

## Documents

- [MVP handover](./the-watch-list-handover.md) - product strategy, public positioning, MVP scope, functional requirements, copy, data model guidance, and definition of done.
- [Automation addendum](./the-watch-list-automation-addendum.md) - future AI-assisted newsletter operations model, admin approval flow, issue/send logging, cron strategy, email provider options, and AI content guardrails.

## Implemented In This PR

- Homepage Watch List signup section.
- Dedicated `/watch-list` landing page.
- Compact footer signup.
- Sold-watch alert CTA on watch detail pages.
- Structured sourcing request form.
- Server-side API routes for signup, alerts, and sourcing requests.
- Supabase migration for subscribers, preferences, watch alerts, and sourcing requests.
- Consent capture, duplicate-email handling, source/UTM metadata, basic spam protection, and successful-submit analytics events.
- Newsletter operations migration from the automation addendum: issues, issue items, AI generation runs, send logs, evergreen content, public archive views, admin RPCs, and cron due-issue helper.
- Public archive routes at `/watch-list/archive` and `/watch-list/archive/[slug]`.
- Protected newsletter operation routes for draft generation, section generation, approval, scheduling, test sends, approved sends, send logging, and cron checks.
- Resend email sending with per-recipient unsubscribe links and private delivery-event logging.
- Public unsubscribe route at `/watch-list/unsubscribe`.
- Gemini-backed draft generation when `GEMINI_API_KEY` is configured, with schema validation and server-side HTML sanitization.
- Vercel Cron configuration for scheduled approved sends.

## Approval-Gated Or Not Included Yet

The automation addendum is now partially implemented as a human-in-the-loop newsletter system. Live email sending is available only when provider credentials are configured, an issue is admin-approved, and the send route is explicitly called or scheduled.

Future phases should be approved before implementation:

- Admin newsletter issue editor.
- Resend Audience/Broadcast sync for provider-managed topics and unsubscribe preferences.
- GPT Image hero image generation and Supabase Storage persistence.
- Full admin preview/editor UI for email layout, issue content, and generated image approval.
- Webhook processing for bounces, complaints, and provider unsubscribe events.

The operating rule for future automation is:

> AI drafts. Human approves. System sends. Archive compounds.

No AI-generated newsletter or email send path should bypass authenticated admin approval.
