function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export const FALLBACK_SITE_OG_IMAGE =
  "https://yrzawkqcifuubtltktbk.supabase.co/storage/v1/object/public/watches/unsorted/1780396993109-ly5w4f-img-6212.jpeg";

/**
 * Social crawlers need an image URL they can fetch without auth, and metadata
 * should never echo exotic schemes from CMS-controlled fields. Accept public
 * HTTPS URLs plus same-origin root-relative paths; reject protocol-relative,
 * javascript:, data:, blob:, and malformed values.
 */
export function resolveMetadataImageUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || hasControlCharacter(trimmed)) return null;
  if (trimmed.startsWith("/")) return trimmed.startsWith("//") ? null : trimmed;

  try {
    const imageUrl = new URL(trimmed);
    return imageUrl.protocol === "https:" ? imageUrl.toString() : null;
  } catch {
    return null;
  }
}
