import { NextResponse } from "next/server";
import { fetchSlugById } from "@/lib/inventory/queries";

export const runtime = "nodejs";

function resolveBase(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  return new URL(request.url).origin;
}

/**
 * GET /w/:id - compact share link. Redirects to the canonical /watch/:slug
 * page so social crawlers (Viber, Facebook, WhatsApp) read the product Open
 * Graph tags and render the watch photo preview.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slug = await fetchSlugById(id);
  if (!slug) {
    return new NextResponse("Watch not found", { status: 404 });
  }
  const redirect = NextResponse.redirect(
    new URL(`/watch/${encodeURIComponent(slug)}`, resolveBase(request)),
    308
  );
  // A saved watch keeps its slug, so this hop is stable. Caching it at the
  // edge keeps the extra round trip off the crawler's budget on re-shares.
  redirect.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return redirect;
}
