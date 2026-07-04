import { NextResponse } from "next/server";
import {
  normalizeReferrerSource,
  normalizeVisitorUid,
  recordReferrerVisit,
} from "@/lib/analytics/referrers";
import { checkRateLimit, clientIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!checkRateLimit("track-referrer", clientIpKey(request), { limit: 30, windowMs: 60_000 })) {
    return NextResponse.json({ ok: true, tracked: false, throttled: true });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const source = normalizeReferrerSource(body?.referrer) || normalizeReferrerSource(body?.source);

    if (!source) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    await recordReferrerVisit({
      source,
      uid: normalizeVisitorUid(body?.uid),
      path: typeof body?.path === "string" ? body.path : null,
    });

    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    console.error("track-referrer error:", err);
    // Analytics must never break customer browsing.
    return NextResponse.json({ ok: true, tracked: false });
  }
}
