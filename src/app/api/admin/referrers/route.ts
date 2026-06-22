import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ReferrerMetric = "visitors" | "pageviews";

function getPeriodStart(period: string) {
  if (period === "24h") return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (period === "7d") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

function sourceIconType(source: string) {
  const key = source.toLowerCase();
  if (key.includes("instagram")) return "instagram";
  if (key.includes("facebook") || key === "fb" || key === "meta") return "facebook";
  if (key.includes("google")) return "google";
  if (key.includes("bing")) return "bing";
  if (key.includes("duckduckgo")) return "duckduckgo";
  if (key.includes("tiktok")) return "tiktok";
  if (key.includes("youtube")) return "youtube";
  if (key.includes("thewatchalley")) return "watch-alley";
  return "website";
}

function aggregateRows(events: any[], visitors: any[], metric: ReferrerMetric) {
  const map = new Map<
    string,
    {
      source: string;
      label: string;
      visitors: number;
      pageviews: number;
    }
  >();

  for (const event of events) {
    const key = event.source_key;
    if (!key) continue;
    const current = map.get(key) || {
      source: key,
      label: event.source_label || key,
      visitors: 0,
      pageviews: 0,
    };
    current.pageviews += 1;
    current.label = event.source_label || current.label;
    map.set(key, current);
  }

  for (const visitor of visitors) {
    const key = visitor.source_key;
    if (!key) continue;
    const current = map.get(key) || {
      source: key,
      label: visitor.source_label || key,
      visitors: 0,
      pageviews: 0,
    };
    current.visitors += 1;
    current.label = visitor.source_label || current.label;
    map.set(key, current);
  }

  const rows = Array.from(map.values());
  const metricKey = metric === "pageviews" ? "pageviews" : "visitors";
  rows.sort(
    (a, b) =>
      b[metricKey] - a[metricKey] || b.pageviews - a.pageviews || a.label.localeCompare(b.label)
  );

  const totalVisitors = rows.reduce((sum, row) => sum + row.visitors, 0);
  const totalPageviews = rows.reduce((sum, row) => sum + row.pageviews, 0);
  const totalMetric = metric === "pageviews" ? totalPageviews : totalVisitors;
  const maxMetric = Math.max(
    1,
    ...rows.map((row) => (metric === "pageviews" ? row.pageviews : row.visitors))
  );

  return {
    referrers: rows.slice(0, 20).map((row) => {
      const count = metric === "pageviews" ? row.pageviews : row.visitors;
      const shareRaw = totalMetric > 0 ? (count / totalMetric) * 100 : 0;
      return {
        source: row.source,
        label: row.label,
        icon: sourceIconType(row.source),
        visitors: row.visitors,
        pageviews: row.pageviews,
        count,
        pct: Math.round((count / maxMetric) * 100),
        share: shareRaw > 0 && shareRaw < 0.1 ? "<0.1" : Math.round(shareRaw).toString(),
      };
    }),
    totalVisitors,
    totalPageviews,
  };
}

async function loadFallbackSummary(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  period: string,
  metric: ReferrerMetric
) {
  const column = period === "24h" ? "views_24h" : period === "all" ? "visitor_count" : "views_7d";
  const { data: rows, error } = await supabase
    .from("visitor_referrers")
    .select("source_key, source_label, visitor_count, views_24h, views_7d, last_seen_at")
    .order(column, { ascending: false })
    .limit(15);

  if (error) return null;
  const total = (rows || []).reduce((sum: number, row: any) => sum + (row[column] || 0), 0);
  const max = Math.max(1, ...(rows || []).map((row: any) => row[column] || 0));
  return {
    ok: true,
    period,
    metric,
    source: "legacy-summary",
    referrers: (rows || []).map((row: any) => ({
      source: row.source_key,
      label: row.source_label || row.source_key,
      icon: sourceIconType(row.source_key || ""),
      visitors: row[column] || 0,
      pageviews: row[column] || 0,
      count: row[column] || 0,
      pct: Math.round(((row[column] || 0) / max) * 100),
      share: total > 0 ? Math.round(((row[column] || 0) / total) * 100).toString() : "0",
    })),
    totalVisitors: total,
    totalPageviews: total,
    total,
    fallback: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") || "7d";
    const metricParam = request.nextUrl.searchParams.get("metric");
    const metric: ReferrerMetric = metricParam === "pageviews" ? "pageviews" : "visitors";
    const periodStart = getPeriodStart(period);

    const supabase = createSupabaseAdminClient();

    let eventQuery = supabase
      .from("visitor_referrer_events")
      .select("source_key, source_label, uid, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (periodStart) eventQuery = eventQuery.gte("created_at", periodStart);

    const { data: events, error: eventsError } = await eventQuery;
    if (eventsError) {
      const fallback = await loadFallbackSummary(supabase, period, metric);
      if (fallback) return NextResponse.json(fallback);
      return NextResponse.json({
        ok: false,
        message: "Referrer event tables not found. Run the migration.",
        migrationHint:
          "Open Supabase Dashboard > SQL Editor and run supabase/migrations/20260622101500_create_referrer_events.sql",
        referrers: [],
      });
    }

    let visitorQuery = supabase
      .from("visitor_referrer_visitors")
      .select("source_key, source_label, uid, last_seen_at")
      .limit(10000);
    if (periodStart) visitorQuery = visitorQuery.gte("last_seen_at", periodStart);

    const { data: visitors, error: visitorsError } = await visitorQuery;
    if (visitorsError) {
      return NextResponse.json({
        ok: false,
        message: "Referrer visitor table not found. Run the migration.",
        referrers: [],
      });
    }

    const result = aggregateRows(events || [], visitors || [], metric);
    return NextResponse.json({
      ok: true,
      period,
      metric,
      source: "first-party-referrer-events",
      ...result,
      total: metric === "pageviews" ? result.totalPageviews : result.totalVisitors,
    });
  } catch (err) {
    console.error("admin referrers error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load referrers", referrers: [] },
      { status: 500 }
    );
  }
}
