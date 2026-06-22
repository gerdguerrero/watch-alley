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

/**
 * GET /api/watch-list/unsubscribe?token=...
 *
 * User clicked the unsubscribe link in their email.  We verify the token but
 * do NOT unsubscribe yet — instead redirect to a confirmation page that asks
 * "Are you sure?" before committing the change.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const verified = verifyUnsubscribeToken(token);
  const base = resolveBase(request);

  if (!verified) {
    return NextResponse.redirect(
      new URL(`/watch-list/unsubscribe?status=invalid`, base)
    );
  }

  // Redirect to the confirmation page, carrying the token so the user can
  // confirm the unsubscribe there.
  return NextResponse.redirect(
    new URL(
      `/watch-list/unsubscribe?token=${encodeURIComponent(token)}`,
      base
    )
  );
}

/**
 * POST /api/watch-list/unsubscribe
 *
 * Called from the confirmation page ("Yes, unsubscribe me") or from the
 * email client's built-in one-click unsubscribe (RFC 8058).
 *
 * Body (JSON):
 *   { token: string, reason?: string }
 *
 * For email-client one-click (List-Unsubscribe-Post), the token may also
 * arrive as a query parameter or form-encoded — we handle both.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const base = resolveBase(request);

  let token = "";
  let reason: string | undefined;

  // Try JSON body first (our confirmation page)
  try {
    const body = await request.clone().json();
    token = body.token || "";
    reason = body.reason || undefined;
  } catch {
    // Not JSON — try query param or form-encoded (email client one-click)
    token = url.searchParams.get("token") || "";
    try {
      const form = await request.formData();
      token = token || (form.get("token") as string) || "";
      const listUnsubscribe = form.get("List-Unsubscribe");
      if (listUnsubscribe === "One-Click") {
        // RFC 8058 one-click — no confirmation, just do it
      }
    } catch {
      // Fall through with whatever token we have
    }
  }

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Missing unsubscribe token." },
      { status: 400 }
    );
  }

  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    return NextResponse.json(
      { ok: false, message: "Invalid or expired unsubscribe token." },
      { status: 400 }
    );
  }

  try {
    const result = await unsubscribeWatchListEmail(verified.email, reason);
    if (!result.found) {
      console.info("Unsubscribe token was valid, but no subscriber row matched.");
    }

    return NextResponse.json(
      { ok: true, email: verified.email },
      {
        status: 200,
        headers: {
          Location: new URL(
            `/watch-list/unsubscribe?status=success`,
            base
          ).toString(),
        },
      }
    );
  } catch (error) {
    console.error("Watch List unsubscribe failed:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to unsubscribe. Please try again." },
      {
        status: 500,
        headers: {
          Location: new URL(
            `/watch-list/unsubscribe?status=error`,
            base
          ).toString(),
        },
      }
    );
  }
}
