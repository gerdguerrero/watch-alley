/**
 * Inventory display helpers. Pure functions only — no DOM, no fetch.
 * Both Server Components and Client Components import from here.
 */

export function formatPhp(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  return `₱ ${price.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function formatWatchMeta(parts: Array<string | undefined | null>): string {
  return parts
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.replace(/\s+/g, " ").trim().toUpperCase())
    .join(" · ");
}

export function badgeIsBrandNew(badge: string): boolean {
  return badge.toLowerCase().includes("brand new");
}
