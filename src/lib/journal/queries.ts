import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { JournalPost, JournalRow, JournalStatus } from "./types";

const SELECT_COLUMNS =
  "slug, title, summary, body_markdown, hero_image, tags, status, author, read_minutes, published_at";

function normalizeStatus(value: string | null): JournalStatus {
  if (value === "draft" || value === "scheduled" || value === "published") {
    return value;
  }
  return "published";
}

function normalizeDashCharacters(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/([0-9])\s*[\u2013]\s*([0-9])/g, "$1-$2")
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, " - ");
}

function normalizeDisplayText(value: string | null | undefined): string {
  return normalizeDashCharacters(value).replace(/\s+/g, " ").trim();
}

function normalizeRow(row: JournalRow): JournalPost {
  return {
    slug: row.slug ?? "",
    title: normalizeDisplayText(row.title),
    summary: normalizeDisplayText(row.summary),
    bodyMarkdown: normalizeDashCharacters(row.body_markdown).trim(),
    heroImage: row.hero_image ?? "",
    tags: Array.isArray(row.tags) ? row.tags.map(normalizeDisplayText) : [],
    status: normalizeStatus(row.status),
    author: normalizeDisplayText(row.author) || "The Watch Alley",
    readMinutes: typeof row.read_minutes === "number" ? row.read_minutes : null,
    publishedAt: row.published_at ?? "",
  };
}

/**
 * Fetch published journal posts, newest first.
 */
export async function fetchJournalPosts(limit?: number): Promise<JournalPost[]> {
  const cacheKey = ["fetchJournalPosts", limit?.toString() || "all"];

  const getCachedPosts = unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
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
      return (data ?? []) as unknown as JournalRow[];
    },
    cacheKey,
    {
      revalidate: 15, // Cache for 15 seconds to keep edge transition speeds high
      tags: ["journal"],
    }
  );

  const rows = await getCachedPosts();
  return rows.map(normalizeRow);
}

export async function fetchJournalPost(slug: string): Promise<JournalPost | null> {
  const getCachedPost = unstable_cache(
    async (s: string) => {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("journal_posts")
        .select(SELECT_COLUMNS)
        .eq("slug", s)
        .eq("status", "published")
        .maybeSingle();
      if (error || !data) return null;
      return data as unknown as JournalRow;
    },
    [`journal-post-by-slug-${slug}`],
    {
      revalidate: 15,
      tags: [`journal-${slug}`],
    }
  );

  const data = await getCachedPost(slug);
  if (!data) return null;
  return normalizeRow(data);
}

/**
 * Every published journal slug - feeds /journal/[slug] generateStaticParams.
 */
export async function fetchPublishedJournalSlugs(): Promise<string[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select("slug")
    .eq("status", "published");
  if (error || !data) {
    console.error("fetchPublishedJournalSlugs failed:", error?.message);
    return [];
  }
  return (data as Array<{ slug: string | null }>)
    .map((r) => r.slug)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}
