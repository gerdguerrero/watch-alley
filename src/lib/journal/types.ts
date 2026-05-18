/**
 * Journal domain types. Sourced from public.journal_posts (RLS-filtered to
 * status='published' for anon callers).
 *
 * See docs/migrations/0013-watch-alley-journal.sql for the schema; only the
 * columns we actually consume are typed here.
 */

export type JournalStatus = "draft" | "scheduled" | "published";

export interface JournalPost {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  heroImage: string;
  tags: string[];
  status: JournalStatus;
  author: string;
  readMinutes: number | null;
  publishedAt: string;
}

export interface JournalRow {
  slug: string | null;
  title: string | null;
  summary: string | null;
  body_markdown: string | null;
  hero_image: string | null;
  tags: string[] | null;
  status: string | null;
  author: string | null;
  read_minutes: number | null;
  published_at: string | null;
}
