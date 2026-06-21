import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ ok: false, message: "Missing slug" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Check if row exists, then upsert
    const { data: existing, error: selErr } = await supabase
      .from("watch_page_views")
      .select("slug, view_count")
      .eq("slug", slug)
      .maybeSingle();

    if (selErr) {
      // Table doesn't exist yet (or other persistent error)
      console.error("watch_page_views select error:", selErr);
      return NextResponse.json({ ok: true, cached: true });
    }

    if (existing) {
      const { error: updErr } = await supabase
        .from("watch_page_views")
        .update({
          view_count: existing.view_count + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("slug", slug);
      if (updErr) {
        console.error("watch_page_views update error:", updErr);
        return NextResponse.json({ ok: true, cached: true });
      }
    } else {
      const { error: insErr } = await supabase.from("watch_page_views").insert({
        slug,
        view_count: 1,
        first_viewed_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
      });
      if (insErr) {
        console.error("watch_page_views insert error:", insErr);
        return NextResponse.json({ ok: true, cached: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, cached: true });
  }
}
