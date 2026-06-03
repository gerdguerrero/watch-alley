import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { curateWatch, curateWatches, isHiddenWatchId } from "./curation";
import { normalizeWatchRow } from "./normalize";
import type { Watch, WatchRow, WatchStatus } from "./types";

/**
 * Public server-side inventory queries. Every read goes through the
 * `public.watches` view, which RLS gates to published rows only. These use a
 * cookie-free anon client so `generateStaticParams`, metadata, and ISR can run
 * during build/prerender without a request context.
 */

const SELECT_COLUMNS = `
  id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, provenance, primary_image, images,
  inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
  service_history, featured, low_stock, display_order, published, category, badges
`;

interface FetchOptions {
  status?: WatchStatus | "all";
  category?: string;
  badge?: string;
  limit?: number;
}

/**
 * Fetch published watches, optionally filtered by status/category/badge. Sorted by display
 * order ascending — admin controls priority via the `display_order` column.
 */
export async function fetchWatches(options: FetchOptions = {}): Promise<Watch[]> {
  const { status = "all", category, badge, limit } = options;

  // Generate a stable key for Next.js cache based on option inputs
  const cacheKey = [
    "fetchWatches",
    status,
    category || "none",
    badge || "none",
    limit?.toString() || "all",
  ];

  const getCachedWatches = unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
      let query = supabase
        .from("watches")
        .select(SELECT_COLUMNS)
        .eq("published", true)
        .order("display_order", { ascending: true, nullsFirst: false });

      if (status !== "all") query = query.eq("status", status);
      if (category) query = query.eq("category", category);
      // `badges` is jsonb, not a Postgres text[] column. Supabase's
      // `.contains("badges", [badge])` serializes arrays as `{badge}`, which
      // only matches Postgres array columns. Pass JSON text so PostgREST emits
      // `badges=cs.["limited-edition"]` for jsonb containment.
      if (badge) query = query.contains("badges", JSON.stringify([badge]));
      if (typeof limit === "number" && limit > 0) query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        console.error("fetchWatches failed:", error.message);
        return [];
      }
      return (data ?? []) as unknown as WatchRow[];
    },
    cacheKey,
    {
      revalidate: 15, // Edge-cache for 15 seconds to ensure instantaneous transitions
      tags: ["watches"],
    }
  );

  const rows = await getCachedWatches();
  return curateWatches(rows.map(normalizeWatchRow));
}

/**
 * Featured watch for the hero card. Prefers the row flagged `featured = true`;
 * falls back to the first available piece.
 */
export async function fetchFeaturedWatch(): Promise<Watch | null> {
  const watches = await fetchWatches({ status: "available" });
  if (watches.length === 0) return null;
  return watches.find((w) => w.featured) ?? watches[0];
}

/**
 * Fetch a single published watch by slug. Returns null on miss so the page
 * can call `notFound()` and Next.js can render a 404 with the right status
 * code. Used by /watch/[slug] (SSG + ISR).
 */
export async function fetchWatchBySlug(slug: string): Promise<Watch | null> {
  const getCachedWatch = unstable_cache(
    async (s: string) => {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("watches")
        .select(SELECT_COLUMNS)
        .eq("slug", s)
        .eq("published", true)
        .maybeSingle();
      if (error || !data) return null;
      return data as unknown as WatchRow;
    },
    [`watch-by-slug-${slug}`],
    {
      revalidate: 15,
      tags: [`watch-${slug}`],
    }
  );

  const data = await getCachedWatch(slug);
  if (!data) return null;
  return curateWatch(normalizeWatchRow(data));
}

/**
 * Every published slug — feeds `generateStaticParams` so each watch page is
 * pre-rendered at build time. Unknown slugs fall through to on-demand ISR.
 */
export async function fetchPublishedSlugs(): Promise<string[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.from("watches").select("id, slug").eq("published", true);
  if (error || !data) {
    console.error("fetchPublishedSlugs failed:", error?.message);
    return [];
  }
  return (data as Array<{ id: string | null; slug: string | null }>)
    .filter((r) => !r.id || !isHiddenWatchId(r.id))
    .map((r) => r.slug)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}
