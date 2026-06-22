import { type NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Not authorized.", count: 0 },
      { status: 401 }
    );
  }

  try {
    const period = request.nextUrl.searchParams.get("period") || "7d";
    const supabase = createSupabaseAdminClient();

    // Count unique visitors within the time window
    let hours: number | null = 168; // default 7d
    if (period === "24h") hours = 24;
    else if (period === "all") hours = null;

    if (hours) {
      // Count visitors whose last_seen_at is within the window
      const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();

      const { count, error } = await supabase
        .from("visitor_ids")
        .select("*", { count: "exact", head: true })
        .gte("last_seen_at", cutoff);

      if (error) {
        return NextResponse.json({
          ok: false,
          error: "visitor_ids table not found. Run the migration.",
          count: 0,
        });
      }

      return NextResponse.json({ ok: true, count: count || 0, period });
    }

    // All-time: count all rows
    const { count, error } = await supabase
      .from("visitor_ids")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        ok: false,
        error: "visitor_ids table not found.",
        count: 0,
      });
    }

    return NextResponse.json({ ok: true, count: count || 0, period });
  } catch (err) {
    console.error("unique-visitors error:", err);
    return NextResponse.json({ ok: false, message: "Failed to load", count: 0 }, { status: 500 });
  }
}
