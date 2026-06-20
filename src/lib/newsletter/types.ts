export type NewsletterStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "scheduled"
  | "sending"
  | "sent"
  | "archived"
  | "rejected"
  | "failed";

export interface NewsletterIssue {
  id: string;
  slug: string;
  publicTitle: string;
  subject: string;
  preheader: string;
  introHtml: string;
  bodyHtml: string;
  bodyText: string;
  heroImageUrl: string;
  sentAt: string;
}

export interface NewsletterIssueItem {
  id: string;
  issueId: string;
  itemType: string;
  itemId: string;
  title: string;
  summary: string;
  url: string;
  imageUrl: string;
  position: number;
}

export interface NewsletterIssueRow {
  id: string | null;
  slug: string | null;
  public_title: string | null;
  subject: string | null;
  preheader: string | null;
  intro_html: string | null;
  body_html: string | null;
  body_text: string | null;
  hero_image_url: string | null;
  sent_at: string | null;
}

export interface NewsletterIssueItemRow {
  id: string | null;
  issue_id: string | null;
  item_type: string | null;
  item_id: string | null;
  title: string | null;
  summary: string | null;
  url: string | null;
  image_url: string | null;
  position: number | null;
}
