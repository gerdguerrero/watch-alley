import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PERIOD_COLUMNS: Record<string, string> = {
  all: "visitor_count",
  "24h": "views_24h",
  "7d": "views_7d",
};

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") || "7d";
    const sortColumn = PERIOD_COLUMNS[period] || PERIOD_COLUMNS["7d"];

    const supabase = createSupabaseAdminClient();

    const { data: rows, error } = await supabase
      .from("visitor_referrers")
      .select("source_key, source_label, visitor_count, views_24h, views_7d, last_seen_at")
      .order(sortColumn, { ascending: false })
      .limit(15);

    if (error) {
      return NextResponse.json({
        ok: false,
        message: "visitor_referrers table not found. Run the migration.",
        migrationHint:
          "Open Supabase Dashboard > SQL Editor and run supabase/migrations/20260622093000_create_visitor_referrers.sql",
        referrers: [],
      });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, referrers: [], period, total: 0 });
    }

    const max = Math.max(1, (rows[0] as any)[sortColumn] || 0);
    const total = rows.reduce((sum, row) => sum + ((row as any)[sortColumn] || 0), 0);

    const referrers = rows.map((row: any) => ({
      source: row.source_key,
      label: row.source_label || row.source_key,
      count: row[sortColumn] || 0,
      count_all: row.visitor_count || 0,
      pct: Math.round(((row[sortColumn] || 0) / max) * 100),
      share: total > 0 ? Math.round(((row[sortColumn] || 0) / total) * 100) : 0,
      last_seen_at: row.last_seen_at,
    }));

    return NextResponse.json({ ok: true, referrers, period, total });
  } catch (err) {
    console.error("admin referrers error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load referrers", referrers: [] },
      { status: 500 }
    );
  }
}
