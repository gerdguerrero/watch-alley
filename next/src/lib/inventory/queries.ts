import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeWatchRow } from "./normalize";
import type { Watch, WatchRow, WatchStatus } from "./types";

/**
 * Server-side inventory queries. Every read goes through the `public.watches`
 * view, which RLS gates to published rows only. The anon key is enforced by
 * `@supabase/ssr` — these queries never expose it to the browser.
 */

const SELECT_COLUMNS = `
  id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, provenance, primary_image, images,
  inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
  service_history, featured, low_stock, display_order, published
`;

interface FetchOptions {
  status?: WatchStatus | "all";
  limit?: number;
}

/**
 * Fetch published watches, optionally filtered by status. Sorted by display
 * order ascending — admin controls priority via the `display_order` column.
 */
export async function fetchWatches(
  options: FetchOptions = {}
): Promise<Watch[]> {
  const { status = "all", limit } = options;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("watches")
    .select(SELECT_COLUMNS)
    .eq("published", true)
    .order("display_order", { ascending: true, nullsFirst: false });

  if (status !== "all") query = query.eq("status", status);
  if (typeof limit === "number" && limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("fetchWatches failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as WatchRow[];
  return rows.map(normalizeWatchRow);
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
