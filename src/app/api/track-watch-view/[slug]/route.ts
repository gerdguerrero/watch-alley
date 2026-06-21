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
    const now = new Date().toISOString();

    // Read existing row
    const { data: existing, error: selErr } = await supabase
      .from("watch_page_views")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (selErr) {
      console.error("watch_page_views select error:", selErr);
      return NextResponse.json({ ok: true, cached: true });
    }

    if (existing) {
      // Lazy-reset windowed counters if window expired
      const windowStarted = new Date(existing.window_started_at || existing.last_viewed_at);
      const hoursSinceWindowStart = (Date.now() - windowStarted.getTime()) / 3_600_000;

      let views24h = existing.views_24h + 1;
      let views7d = existing.views_7d + 1;
      let windowStart = existing.window_started_at;

      if (hoursSinceWindowStart >= 24) {
        views24h = 1;
        if (hoursSinceWindowStart >= 168) {
          views7d = 1;
        }
        windowStart = now;
      } else if (hoursSinceWindowStart >= 168) {
        views7d = 1;
        views24h = 1;
        windowStart = now;
      }

      const { error: updErr } = await supabase
        .from("watch_page_views")
        .update({
          view_count: existing.view_count + 1,
          views_24h: views24h,
          views_7d: views7d,
          window_started_at: windowStart,
          last_viewed_at: now,
        })
        .eq("slug", slug);

      if (updErr) {
        console.error("watch_page_views update error:", updErr);
        return NextResponse.json({ ok: true, cached: true });
      }
    } else {
      // First view — all counters start at 1
      const { error: insErr } = await supabase.from("watch_page_views").insert({
        slug,
        view_count: 1,
        views_24h: 1,
        views_7d: 1,
        window_started_at: now,
        first_viewed_at: now,
        last_viewed_at: now,
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
