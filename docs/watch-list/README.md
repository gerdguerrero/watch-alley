# The Watch List

**Feature name:** The Watch List by The Watch Alley  
**Current branch scope:** Collector signup, preference capture, sold-watch alerts, and sourcing requests.  
**Status:** Approval / discussion branch before production merge.

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

## Not Included Yet

The automation addendum is intentionally documented for team discussion, not shipped as live automation in this PR.

Future phases should be approved before implementation:

- Admin newsletter issue editor.
- Email provider integration.
- Test email flow.
- AI draft generation.
- Human approval workflow.
- Scheduled sending via cron.
- Public issue archive.

The operating rule for future automation is:

> AI drafts. Human approves. System sends. Archive compounds.

No AI-generated newsletter or email send path should bypass authenticated admin approval.
