import { NextResponse } from "next/server";
import {
  normalizeReferrerSource,
  normalizeVisitorUid,
  recordReferrerVisit,
} from "@/lib/analytics/referrers";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
