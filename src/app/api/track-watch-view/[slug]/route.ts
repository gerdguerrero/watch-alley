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

    // Upsert: increment view_count, update last_viewed_at
    const { error } = await supabase.rpc("upsert_watch_page_view", {
      p_slug: slug,
    });

    // If RPC doesn't exist yet, fall back to manual upsert
    if (error && error.message?.includes("function") && error.message?.includes("not found")) {
      // Check if row exists
      const { data: existing } = await supabase
        .from("watch_page_views")
        .select("slug, view_count")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("watch_page_views")
          .update({
            view_count: existing.view_count + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq("slug", slug);
      } else {
        await supabase.from("watch_page_views").insert({
          slug,
          view_count: 1,
          first_viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
        });
      }
    } else if (error) {
      console.error("watch_page_views upsert error:", error);
      // Table might not exist yet — silently fail (graceful degradation)
      return NextResponse.json({ ok: true, cached: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Graceful degradation if table doesn't exist
    return NextResponse.json({ ok: true, cached: true });
  }
}
