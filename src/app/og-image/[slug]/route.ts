import { NextResponse } from "next/server";
import { thumbnailUrl } from "@/lib/inventory/image";
import { fetchWatchBySlug } from "@/lib/inventory/queries";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Serve the pre-generated ~900px WebP sibling that every watch photo already
 * has (made at upload time, see lib/inventory/image.ts), and fall back to the
 * original object if the sibling is missing.
 *
 * This used to ask Supabase Storage to resize on the fly
 * (/storage/v1/render/image/... ?width=1200&quality=60). Every distinct photo
 * the crawlers touched counted as one "origin image" against the Pro plan's
 * 100 per billing cycle; with 370 listings the meter sat at 375% and the
 * spend cap was about to refuse transforms. The sibling costs nothing extra,
 * is a fraction of the original's bytes, and is still larger than any preview
 * card renders, so Viber's crawler keeps its fast response.
 */
async function fetchPreview(imageUrl: string): Promise<Response | null> {
  const sibling = thumbnailUrl(imageUrl);
  if (sibling && sibling !== imageUrl) {
    const thumb = await fetch(sibling);
    if (thumb.ok && thumb.body) return thumb;
  }
  const original = await fetch(imageUrl);
  return original.ok && original.body ? original : null;
}

/**
 * GET /og-image/:slug - same-origin proxy for the watch primary photo.
 * Social crawlers (Viber, Facebook, WhatsApp) read `og:image` from this URL
 * instead of the cross-origin Supabase Storage object, so the preview photo
 * is served from thewatchalley.com itself.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const watch = await fetchWatchBySlug(slug);
  const imageUrl = watch?.primaryImage;
  if (!imageUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = await fetchPreview(imageUrl);
  if (!upstream?.body) {
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
    // stale-while-revalidate means every crawl after the first is served from
    // the edge immediately and refreshed in the background, so a re-share of
    // an older listing never pays the cold-fetch cost again.
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  });
  // Crawlers that check the size before downloading need this; streaming the
  // body without it falls back to chunked encoding.
  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { headers });
}
