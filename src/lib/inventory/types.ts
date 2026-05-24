/**
 * Domain types for inventory.
 *
 * The Supabase row shape (snake_case, nullable nearly everywhere) is the
 * persistence concern. Domain code works exclusively with `Watch`, which
 * normalizes nulls into defaults and renames fields to camelCase. The
 * normalizer is in [./normalize.ts]; queries are in [./queries.ts].
 */

export type WatchStatus = "available" | "reserved" | "sold";

export interface Watch {
  id: string;
  slug: string;
  brand: string;
  model: string;
  reference: string;
  name: string;
  price: number;
  currency: "PHP" | string;
  status: WatchStatus;
  conditionLabel: string;
  badge: string;
  movement: string;
  caseSize: string;
  set: string;
  material: string;
  edition: string;
  description: string;
  disclosure: string;
  provenance: string;
  primaryImage: string;
  images: string[];
  inquirySubject: string;
  inquiryBody: string;
  soldAt: string;
  soldPrice: number | null;
  hasBox: boolean | null;
  hasPapers: boolean | null;
  serviceHistory: string;
  featured: boolean;
  lowStock: boolean;
  displayOrder: number | null;
  published: boolean;
  category: "brand-new" | "pre-owned" | "limited-edition" | null;
}

/**
 * The raw row shape returned by the `public.watches` view. Anything missing
 * from this list won't appear in the Supabase response and must not be
 * referenced by the normalizer.
 *
 * Keep in sync with [docs/migrations/0001-watch-alley-bootstrap.sql] and the
 * `published` column added in [docs/migrations/0014-watch-alley-published-state.sql].
 */
export interface WatchRow {
  id: string | null;
  slug: string | null;
  brand: string | null;
  model: string | null;
  reference: string | null;
  name: string | null;
  price: number | string | null;
  currency: string | null;
  status: string | null;
  condition_label: string | null;
  badge: string | null;
  movement: string | null;
  case_size: string | null;
  inclusion_set: string | null;
  material: string | null;
  edition: string | null;
  description: string | null;
  disclosure: string | null;
  provenance: string | null;
  primary_image: string | null;
  images: string[] | null;
  inquiry_subject: string | null;
  inquiry_body: string | null;
  sold_at: string | null;
  sold_price: number | null;
  has_box: boolean | null;
  has_papers: boolean | null;
  service_history: string | null;
  featured: boolean | null;
  low_stock: boolean | null;
  display_order: number | null;
  published: boolean | null;
  category: string | null;
}
