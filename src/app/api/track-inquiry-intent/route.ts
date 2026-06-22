import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function positiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const watchSlug = text(body?.watchSlug, 180);

  if (!watchSlug) {
    return NextResponse.json({ ok: false, message: "Missing watch slug" }, { status: 400 });
  }

  const payload = {
    watchId: text(body?.watchId, 80),
    watchSlug,
    watchTitle: text(body?.watchTitle, 220),
    watchReference: text(body?.watchReference, 120),
    watchPricePhp: positiveInteger(body?.watchPricePhp),
    watchStatus: text(body?.watchStatus, 24),
    messageText: text(body?.messageText, 2000),
    targetUrl: text(body?.targetUrl, 1000),
    sourcePath: text(body?.sourcePath, 500),
    referrer: text(body?.referrer, 1000),
    visitorUid: text(body?.visitorUid, 80),
    countryCode: text(request.headers.get("x-vercel-ip-country"), 2).toUpperCase(),
    userAgent: text(request.headers.get("user-agent"), 500),
  };

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("service_record_inquiry_intent", { payload });

    if (error) {
      console.error("service_record_inquiry_intent error:", error);
      return NextResponse.json({ ok: true, cached: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("track-inquiry-intent error:", error);
    return NextResponse.json({ ok: true, cached: true });
  }
}
