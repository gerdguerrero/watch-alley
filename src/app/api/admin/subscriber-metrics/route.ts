import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/admin/subscriber-metrics
 *
 * Returns newsletter subscriber counts, geographic breakdown, source
 * attribution, newsletter issue stats, recent signups, and unsubscribe
 * reasons for the admin dashboard.
 *
 * Auth: requires a valid Supabase Auth session with admin allowlist access
 * (enforced by the `admin_subscriber_metrics()` RPC's `is_admin()` guard).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc("admin_subscriber_metrics");

    if (error) {
      console.error("admin_subscriber_metrics RPC failed:", error.message);
      return NextResponse.json(
        { ok: false, message: "Failed to load subscriber metrics." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
  } catch (err) {
    console.error("subscriber-metrics error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load subscriber metrics." },
      { status: 500 }
    );
  }
}
