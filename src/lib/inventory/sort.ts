/**
 * Catalog sort helpers. Pure functions - safe to import from Server and
 * Client Components. Applied in-memory by /available and /sold after
 * `fetchWatches`, so adding a sort option never expands the query cache key.
 */
import type { Watch } from "./types";

export type SortKey =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "recent"
  | "earliest"
  | "newest"
  | "oldest";

/** Sort options for the live catalog (/available). */
export const AVAILABLE_SORTS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest Listed" },
  { value: "oldest", label: "Oldest Listed" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Sort options for the archive (/sold). */
export const SOLD_SORTS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "recent", label: "Recently Sold" },
  { value: "earliest", label: "Earliest Sold" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Sold pieces list the sale price; available pieces the asking price. */
function priceOf(w: Watch): number {
  return (w.soldPrice ?? w.price) || 0;
}

/**
 * Compare ISO-8601 / "YYYY-MM" date strings ascending; empty values sink to
 * the end regardless of direction so undated rows never lead the catalog.
 */
function compareDates(a: string, b: string, direction: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b) * direction;
}

/**
 * Return a sorted copy. `featured` keeps the query's `display_order`;
 * `recent`/`earliest` order by `sold_at` ("YYYY-MM", lexicographically
 * comparable); `newest`/`oldest` order by `created_at` (ISO timestamp).
 */
export function sortWatches(watches: Watch[], sort: SortKey | undefined): Watch[] {
  const list = [...watches];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => priceOf(a) - priceOf(b));
    case "price-desc":
      return list.sort((a, b) => priceOf(b) - priceOf(a));
    case "recent":
      return list.sort((a, b) => compareDates(a.soldAt, b.soldAt, -1));
    case "earliest":
      return list.sort((a, b) => compareDates(a.soldAt, b.soldAt, 1));
    case "newest":
      return list.sort((a, b) => compareDates(a.createdAt, b.createdAt, -1));
    case "oldest":
      return list.sort((a, b) => compareDates(a.createdAt, b.createdAt, 1));
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
