import { NextResponse } from "next/server";
import { unsubscribeWatchListEmail, verifyUnsubscribeToken } from "@/lib/watch-list/unsubscribe";

export const runtime = "nodejs";

function redirectStatus(base: string, status: "invalid" | "success" | "error") {
  return NextResponse.redirect(new URL(`/watch-list/unsubscribe?status=${status}`, base));
}

async function handleUnsubscribe(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const verified = verifyUnsubscribeToken(token);
  const isPost = request.method === "POST";

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
    if (isPost) {
      return NextResponse.json(
        { ok: false, message: "Invalid unsubscribe token." },
        { status: 400 }
      );
    }
    return redirectStatus(base, "invalid");
  }

  try {
    const result = await unsubscribeWatchListEmail(verified.email);
    if (!result.found) {
      console.info("Unsubscribe token was valid, but no subscriber row matched.");
    }
    if (isPost) {
      return NextResponse.json({ ok: true });
    }
    return redirectStatus(base, "success");
  } catch (error) {
    console.error("Watch List unsubscribe failed:", error);
    if (isPost) {
      return NextResponse.json({ ok: false, message: "Unable to unsubscribe." }, { status: 500 });
    }
    return redirectStatus(base, "error");
  }
}

export function GET(request: Request) {
  return handleUnsubscribe(request);
}

export function POST(request: Request) {
  return handleUnsubscribe(request);
}
