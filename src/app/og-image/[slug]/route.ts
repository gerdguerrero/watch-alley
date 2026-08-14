import { NextResponse } from "next/server";
import { fetchWatchBySlug } from "@/lib/inventory/queries";

export const runtime = "nodejs";
export const revalidate = 3600;

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

  const upstream = await fetch(imageUrl);
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
