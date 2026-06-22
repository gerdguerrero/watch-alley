import { type NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.valueOf()) ? null : date;
}

function resolveRange(request: NextRequest) {
  const now = new Date();
  const today = startOfUtcDay(now);
  const params = request.nextUrl.searchParams;
  const range = params.get("range");
  const period = params.get("period");

  if (range === "custom") {
    const fromParam = parseDateParam(params.get("from"));
    const toParam = parseDateParam(params.get("to"));
    if (fromParam && toParam && fromParam <= toParam) {
      const days = Math.max(
        1,
        Math.round((toParam.valueOf() - fromParam.valueOf()) / 86_400_000) + 1
      );
      return { key: range, from: fromParam, to: toParam, days, allTime: false };
    }
  }

  if (period === "all" || range === "all") {
    return { key: "all", from: null, to: today, days: 0, allTime: true };
  }

  const daysByRange: Record<string, number> = {
    "24h": 1,
    "7d": 7,
    last7: 7,
    last14: 14,
    last30: 30,
    last90: 90,
  };
  const key = range || period || "last7";
  const days = daysByRange[key] ?? daysByRange.last7;

  return {
    key: key in daysByRange ? key : "last7",
    from: addDays(today, -days),
    to: today,
    days: days + 1,
    allTime: false,
  };
}

function buildDailySeries(rows: { last_seen_at: string | null }[], from: Date, days: number) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.last_seen_at) continue;
    const date = row.last_seen_at.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = isoDate(addDays(from, index));
    return { date, visitors: counts.get(date) ?? 0 };
  });
}

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Not authorized.",
        count: 0,
        series: [],
      },
      { status: 401 }
    );
  }

  try {
    const range = resolveRange(request);
    const supabase = createSupabaseAdminClient();

    if (!range.allTime && range.from) {
      const cutoff = range.from.toISOString();
      const { data, error } = await supabase
        .from("visitor_ids")
        .select("last_seen_at")
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", { ascending: true });

      if (error) {
        return NextResponse.json({
          ok: false,
          error: "visitor_ids table not found. Run the migration.",
          count: 0,
          series: [],
        });
      }

      const rows = Array.isArray(data) ? data : [];
      return NextResponse.json({
        ok: true,
        count: rows.length,
        period: range.key,
        range: {
          key: range.key,
          from: isoDate(range.from),
          to: isoDate(range.to),
          days: range.days,
        },
        series: buildDailySeries(rows, range.from, range.days),
      });
    }

    // All-time: count all rows and build a compact last-seen distribution.
    const { data, error } = await supabase
      .from("visitor_ids")
      .select("last_seen_at")
      .order("last_seen_at", { ascending: true });

    if (error) {
      return NextResponse.json({
        ok: false,
        error: "visitor_ids table not found.",
        count: 0,
        series: [],
      });
    }

    const rows = Array.isArray(data) ? data : [];
    const firstSeen = rows.find((row) => row.last_seen_at)?.last_seen_at;
    const from = firstSeen ? startOfUtcDay(new Date(firstSeen)) : startOfUtcDay(new Date());
    const days = Math.max(1, Math.round((range.to.valueOf() - from.valueOf()) / 86_400_000) + 1);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      period: "all",
      range: { key: "all", from: isoDate(from), to: isoDate(range.to), days },
      series: buildDailySeries(rows, from, days),
    });
  } catch (err) {
    console.error("unique-visitors error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load", count: 0, series: [] },
      { status: 500 }
    );
  }
}
