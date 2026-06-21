import { NextResponse } from "next/server";
import { unsubscribeWatchListEmail, verifyUnsubscribeToken } from "@/lib/watch-list/unsubscribe";

export const runtime = "nodejs";

async function handleUnsubscribe(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const verified = verifyUnsubscribeToken(token);

  // Resolve base URL for redirects to prevent internal proxy port leaks
  let base = url.origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    base = `${forwardedProto}://${forwardedHost}`;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    base = process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (!verified) {
    return NextResponse.redirect(new URL("/watch-list/unsubscribe?status=invalid", base));
  }

  try {
    await unsubscribeWatchListEmail(verified.email);
    return NextResponse.redirect(new URL("/watch-list/unsubscribe?status=success", base));
  } catch {
    return NextResponse.redirect(new URL("/watch-list/unsubscribe?status=error", base));
  }
}

export function GET(request: Request) {
  return handleUnsubscribe(request);
}

export function POST(request: Request) {
  return handleUnsubscribe(request);
}
