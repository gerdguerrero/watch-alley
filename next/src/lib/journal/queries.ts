import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JournalPost, JournalRow, JournalStatus } from "./types";

const SELECT_COLUMNS =
  "slug, title, summary, body_markdown, hero_image, tags, status, author, read_minutes, published_at";

function normalizeStatus(value: string | null): JournalStatus {
  if (value === "draft" || value === "scheduled" || value === "published") {
    return value;
  }
  return "published";
}

function normalizeRow(row: JournalRow): JournalPost {
  return {
    slug: row.slug ?? "",
    title: row.title ?? "",
    summary: row.summary ?? "",
    bodyMarkdown: row.body_markdown ?? "",
    heroImage: row.hero_image ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: normalizeStatus(row.status),
    author: row.author ?? "The Watch Alley",
    readMinutes:
      typeof row.read_minutes === "number" ? row.read_minutes : null,
    publishedAt: row.published_at ?? "",
  };
}

/**
 * Fetch published journal posts, newest first.
 */
export async function fetchJournalPosts(limit?: number): Promise<JournalPost[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("journal_posts")
    .select(SELECT_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (typeof limit === "number" && limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("fetchJournalPosts failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as JournalRow[]).map(normalizeRow);
}

export async function fetchJournalPost(
  slug: string
): Promise<JournalPost | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select(SELECT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as unknown as JournalRow);
}
