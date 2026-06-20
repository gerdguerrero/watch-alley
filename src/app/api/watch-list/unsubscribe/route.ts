import { NextResponse } from "next/server";
import { unsubscribeWatchListEmail, verifyUnsubscribeToken } from "@/lib/watch-list/unsubscribe";

export const runtime = "nodejs";

async function handleUnsubscribe(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const verified = verifyUnsubscribeToken(token);

  if (!verified) {
    return NextResponse.redirect(new URL("/watch-list/unsubscribe?status=invalid", request.url));
  }

  try {
    await unsubscribeWatchListEmail(verified.email);
    return NextResponse.redirect(new URL("/watch-list/unsubscribe?status=success", request.url));
  } catch {
    return NextResponse.redirect(new URL("/watch-list/unsubscribe?status=error", request.url));
  }
}

export function GET(request: Request) {
  return handleUnsubscribe(request);
}

export function POST(request: Request) {
  return handleUnsubscribe(request);
}
