import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type {
  NewsletterIssue,
  NewsletterIssueItem,
  NewsletterIssueItemRow,
  NewsletterIssueRow,
} from "./types";

const ISSUE_COLUMNS =
  "id, slug, public_title, subject, preheader, intro_html, body_html, body_text, hero_image_url, sent_at";

const ITEM_COLUMNS = "id, issue_id, item_type, item_id, title, summary, url, image_url, position";

function normalizeIssue(row: NewsletterIssueRow): NewsletterIssue {
  return {
    id: row.id ?? "",
    slug: row.slug ?? "",
    publicTitle: row.public_title ?? "",
    subject: row.subject ?? "",
    preheader: row.preheader ?? "",
    introHtml: row.intro_html ?? "",
    bodyHtml: row.body_html ?? "",
    bodyText: row.body_text ?? "",
    heroImageUrl: row.hero_image_url ?? "",
    sentAt: row.sent_at ?? "",
  };
}

function normalizeItem(row: NewsletterIssueItemRow): NewsletterIssueItem {
  return {
    id: row.id ?? "",
    issueId: row.issue_id ?? "",
    itemType: row.item_type ?? "",
    itemId: row.item_id ?? "",
    title: row.title ?? "",
    summary: row.summary ?? "",
    url: row.url ?? "",
    imageUrl: row.image_url ?? "",
    position: typeof row.position === "number" ? row.position : 0,
  };
}

function isMissingNewsletterView(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table 'public.newsletter_issues'") ||
    error.message?.includes("Could not find the table 'public.newsletter_issue_items'")
  );
}

export async function fetchNewsletterIssues(limit = 24): Promise<NewsletterIssue[]> {
  const getCachedIssues = unstable_cache(
    async (count: number) => {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("newsletter_issues")
        .select(ISSUE_COLUMNS)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(Math.max(1, Math.min(count, 100)));

      if (error) {
        if (!isMissingNewsletterView(error)) {
          console.error("fetchNewsletterIssues failed:", error.message);
        }
        return [];
      }

      return (data ?? []) as unknown as NewsletterIssueRow[];
    },
    ["newsletter-issues"],
    { revalidate: 60, tags: ["newsletter-issues"] }
  );

  const rows = await getCachedIssues(limit);
  return rows.map(normalizeIssue);
}

export async function fetchNewsletterIssueBySlug(slug: string): Promise<{
  issue: NewsletterIssue;
  items: NewsletterIssueItem[];
} | null> {
  const getCachedIssue = unstable_cache(
    async (s: string) => {
      const supabase = createSupabasePublicClient();
      const { data: issueData, error: issueError } = await supabase
        .from("newsletter_issues")
        .select(ISSUE_COLUMNS)
        .eq("slug", s)
        .maybeSingle();

      if (issueError || !issueData) return null;

      const issue = issueData as unknown as NewsletterIssueRow;
      const { data: itemData, error: itemError } = await supabase
        .from("newsletter_issue_items")
        .select(ITEM_COLUMNS)
        .eq("issue_id", issue.id)
        .order("position", { ascending: true });

      if (itemError) {
        console.error("fetchNewsletterIssueBySlug items failed:", itemError.message);
      }

      return {
        issue,
        items: (itemData ?? []) as unknown as NewsletterIssueItemRow[],
      };
    },
    [`newsletter-issue-${slug}`],
    { revalidate: 60, tags: [`newsletter-issue-${slug}`] }
  );

  const data = await getCachedIssue(slug);
  if (!data) return null;

  return {
    issue: normalizeIssue(data.issue),
    items: data.items.map(normalizeItem),
  };
}
