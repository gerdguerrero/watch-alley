/**
 * Catalog sort helpers. Pure functions - safe to import from Server and
 * Client Components. Applied in-memory by /available and /sold after
 * `fetchWatches`, so adding a sort option never expands the query cache key.
 */
import type { Watch } from "./types";

export type SortKey = "featured" | "price-asc" | "price-desc" | "recent";

/** Sort options for the live catalog (/available). */
export const AVAILABLE_SORTS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Sort options for the archive (/sold). */
export const SOLD_SORTS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "recent", label: "Recently Sold" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Sold pieces list the sale price; available pieces the asking price. */
function priceOf(w: Watch): number {
  return (w.soldPrice ?? w.price) || 0;
}

/**
 * Return a sorted copy. `featured` keeps the query's `display_order`; `recent`
 * orders by `sold_at` ("YYYY-MM", lexicographically comparable) descending.
 */
export function sortWatches(watches: Watch[], sort: SortKey | undefined): Watch[] {
  const list = [...watches];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => priceOf(a) - priceOf(b));
    case "price-desc":
      return list.sort((a, b) => priceOf(b) - priceOf(a));
    case "recent":
      return list.sort((a, b) => (b.soldAt || "").localeCompare(a.soldAt || ""));
    default:
      return list;
  }
}

/** Distinct brands present in a result set, alphabetised for the filter menu. */
export function collectBrands(watches: Watch[]): string[] {
  return [...new Set(watches.map((w) => w.brand).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}
