/**
 * Image thumbnail resolution. Pure functions — safe in Server and Client
 * Components.
 *
 * The stored watch photos are full-resolution (≈1800px / ~800 KB). Serving
 * them into the small catalog grid tiles and gallery filmstrip is wasteful,
 * and Vercel's optimizer is disabled (quota) while Supabase image transforms
 * are not enabled on this tenant. Instead we keep a sibling thumbnail object
 * next to every photo:
 *
 *   watches/<slug>/<name>.<ext>  ->  watches/<slug>/<name>.thumb.webp   (~900px WebP)
 *
 * Thumbnails are produced at upload time ([public/scripts/admin.js]) and
 * backfilled for existing photos by
 * [scripts/generate-watch-thumbnails.mjs]. Use the full URL for detail/zoom
 * views and `thumbnailUrl()` anywhere the image renders small.
 */

const THUMB_SUFFIX = ".thumb.webp";

// Only Supabase Storage objects in the `watches` bucket have generated
// thumbnails. Local /watch-assets art and any other host are returned as-is so
// a derived URL is never requested for an object that has no thumbnail.
const WATCHES_OBJECT_RE = /\/storage\/v1\/object\/public\/watches\//;

/**
 * Map a stored image URL to its small thumbnail variant, or return the input
 * unchanged when no thumbnail is expected to exist.
 */
export function thumbnailUrl(src: string | null | undefined): string {
  if (!src) return "";
  if (src.endsWith(THUMB_SUFFIX)) return src;
  if (!WATCHES_OBJECT_RE.test(src)) return src;
  // Replace the final file extension with the thumbnail suffix.
  return src.replace(/\.[^./]+$/, THUMB_SUFFIX);
}
