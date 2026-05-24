import type { Watch, WatchRow, WatchStatus } from "./types";

const VALID_STATUSES: ReadonlySet<WatchStatus> = new Set(["available", "reserved", "sold"]);

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "brand-new",
  "pre-owned",
]);

function normalizeStatus(value: string | null): WatchStatus {
  if (value && VALID_STATUSES.has(value as WatchStatus)) {
    return value as WatchStatus;
  }
  return "available";
}

function isValidCategory(value: string | null): value is Watch["category"] {
  return typeof value === "string" && VALID_CATEGORIES.has(value);
}

function nonNullStringList(value: string[] | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string" && s.length > 0);
}

/**
 * Turn a Supabase `public.watches` row into a domain `Watch`.
 *
 * Single source of truth for null-coalescing, camelCase rename, and type
 * coercion. Components consume the `Watch` type — they never see snake_case
 * or nulls.
 */
export function normalizeWatchRow(row: WatchRow): Watch {
  const images = nonNullStringList(row.images);
  const priceNumeric = typeof row.price === "number" ? row.price : Number(row.price ?? 0) || 0;

  return {
    id: row.id ?? "",
    slug: row.slug ?? "",
    brand: row.brand ?? "",
    model: row.model ?? "",
    reference: row.reference ?? "",
    name: row.name ?? "",
    price: priceNumeric,
    currency: row.currency ?? "PHP",
    status: normalizeStatus(row.status),
    conditionLabel: row.condition_label ?? "",
    badge: row.badge ?? "",
    movement: row.movement ?? "",
    caseSize: row.case_size ?? "",
    set: row.inclusion_set ?? "",
    material: row.material ?? "",
    edition: row.edition ?? "",
    description: row.description ?? "",
    disclosure: row.disclosure ?? "",
    provenance: row.provenance ?? "",
    primaryImage: row.primary_image ?? images[0] ?? "",
    images,
    inquirySubject: row.inquiry_subject ?? "",
    inquiryBody: row.inquiry_body ?? "",
    soldAt: row.sold_at ?? "",
    soldPrice: typeof row.sold_price === "number" ? row.sold_price : null,
    hasBox: row.has_box,
    hasPapers: row.has_papers,
    serviceHistory: row.service_history ?? "",
    featured: row.featured === true,
    lowStock: row.low_stock === true,
    displayOrder: typeof row.display_order === "number" ? row.display_order : null,
    published: row.published !== false,
    category: isValidCategory(row.category) ? row.category : null,
    badges: nonNullStringList(row.badges),
  };
}
