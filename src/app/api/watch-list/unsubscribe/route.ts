import { NextResponse } from "next/server";
import { unsubscribeWatchListEmail, verifyUnsubscribeToken } from "@/lib/watch-list/unsubscribe";

export const runtime = "nodejs";

function resolveBase(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  return url.origin;
}

function redirectStatus(base: string, status: "invalid" | "success" | "error") {
  return NextResponse.redirect(new URL(`/watch-list/unsubscribe?status=${status}`, base));
}

async function handleUnsubscribe(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const verified = verifyUnsubscribeToken(token);
  const isPost = request.method === "POST";

  // Resolve base URL for redirects to prevent internal proxy port leaks
  const base = resolveBase(request);

  if (!verified) {
    if (isPost) {
      // For email-client POST (one-click unsubscribe), return 400 so the
      // sending MTA knows the token was invalid.  Most MUAs will also show
      // a generic "unsubscribe failed" UI.
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
      // RFC 8058 one-click unsubscribe: return 200 with a Location header so
      // the MUA can optionally redirect the user to a confirmation page.
      return NextResponse.json(
        { ok: true, email: verified.email },
        {
          status: 200,
          headers: {
            Location: new URL(`/watch-list/unsubscribe?status=success`, base).toString(),
          },
        }
      );
    }
    return redirectStatus(base, "success");
  } catch (error) {
    console.error("Watch List unsubscribe failed:", error);
    if (isPost) {
      return NextResponse.json(
        { ok: false, message: "Unable to unsubscribe." },
        {
          status: 500,
          headers: {
            Location: new URL(`/watch-list/unsubscribe?status=error`, base).toString(),
          },
        }
      );
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
