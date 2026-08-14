import { NextResponse } from "next/server";
import { fetchWatchBySlug } from "@/lib/inventory/queries";

export const runtime = "nodejs";
export const revalidate = 3600;

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";
const PREVIEW_WIDTH = 1200;
const PREVIEW_QUALITY = 60;

/**
 * Ask Supabase Storage to resize on the fly. The stored watch photos run
 * 240 KB - 1.2 MB, and on a cold CDN cache that took ~3s to proxy, which is
 * long enough for Viber's crawler to give up - the reason link previews
 * appeared only intermittently. A 1200px JPEG is a fifth of the bytes and is
 * still larger than any preview card renders.
 */
function previewSourceUrl(imageUrl: string): string {
  if (!imageUrl.includes(OBJECT_PATH)) return imageUrl;
  const resized = imageUrl.replace(OBJECT_PATH, RENDER_PATH);
  return `${resized}?width=${PREVIEW_WIDTH}&quality=${PREVIEW_QUALITY}`;
}

/** Prefer the resized render; fall back to the original object if it fails. */
async function fetchPreview(imageUrl: string): Promise<Response | null> {
  const resized = previewSourceUrl(imageUrl);
  if (resized !== imageUrl) {
    const transformed = await fetch(resized);
    if (transformed.ok && transformed.body) return transformed;
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
