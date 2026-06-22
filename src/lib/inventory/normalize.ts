import type { Watch, WatchRow, WatchStatus } from "./types";

const VALID_STATUSES: ReadonlySet<WatchStatus> = new Set(["available", "reserved", "sold"]);

const VALID_CATEGORIES: ReadonlySet<string> = new Set(["brand-new", "pre-owned"]);

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

function normalizeDashCharacters(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/([0-9])\s*[\u2013]\s*([0-9])/g, "$1-$2")
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, " - ");
}

function normalizeDisplayText(value: string | null | undefined): string {
  return normalizeDashCharacters(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBodyText(value: string | null | undefined): string {
  return normalizeDashCharacters(value).trim();
}

/**
 * Turn a Supabase `public.watches` row into a domain `Watch`.
 *
 * Single source of truth for null-coalescing, camelCase rename, and type
 * coercion. Components consume the `Watch` type - they never see snake_case
 * or nulls.
 */
export function normalizeWatchRow(row: WatchRow): Watch {
  const images = nonNullStringList(row.images);
  const priceNumeric = typeof row.price === "number" ? row.price : Number(row.price ?? 0) || 0;

  return {
    id: row.id ?? "",
    slug: row.slug ?? "",
    brand: normalizeDisplayText(row.brand),
    model: normalizeDisplayText(row.model),
    reference: normalizeDisplayText(row.reference),
    name: normalizeDisplayText(row.name),
    price: priceNumeric,
    currency: row.currency ?? "PHP",
    status: normalizeStatus(row.status),
    conditionLabel: normalizeDisplayText(row.condition_label),
    badge: normalizeDisplayText(row.badge),
    movement: normalizeDisplayText(row.movement),
    caseSize: normalizeDisplayText(row.case_size),
    set: normalizeDisplayText(row.inclusion_set),
    material: normalizeDisplayText(row.material),
    edition: normalizeDisplayText(row.edition),
    description: normalizeBodyText(row.description),
    disclosure: normalizeBodyText(row.disclosure),
    provenance: normalizeBodyText(row.provenance),
    primaryImage: row.primary_image ?? images[0] ?? "",
    images,
    inquirySubject: normalizeDisplayText(row.inquiry_subject),
    inquiryBody: normalizeBodyText(row.inquiry_body),
    soldAt: normalizeDisplayText(row.sold_at),
    soldPrice: typeof row.sold_price === "number" ? row.sold_price : null,
    hasBox: row.has_box,
    hasPapers: row.has_papers,
    serviceHistory: row.service_history ?? "",
    featured: row.featured === true,
    lowStock: row.low_stock === true,
    displayOrder: typeof row.display_order === "number" ? row.display_order : null,
    published: row.published !== false,
    category: isValidCategory(row.category) ? row.category : null,
    badges: nonNullStringList(row.badges).map(normalizeDisplayText),
  };
}
