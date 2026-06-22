import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 5;

const JSON_NO_STORE = {
  "Cache-Control": "no-store",
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: JSON_NO_STORE });
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return json({ ok: false, message: "Missing slug" }, 400);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.rpc("service_record_watch_visit", {
      payload: {
        slug: text(slug, 180),
        countryCode: text(request.headers.get("x-vercel-ip-country"), 2).toUpperCase(),
        uid: text(body?.uid, 80),
      },
    });

    if (error) {
      console.error("service_record_watch_visit error:", error);
      return json({ ok: true, cached: true });
    }

    return json({ ok: true });
  } catch {
    return json({ ok: true, cached: true });
  }
}
