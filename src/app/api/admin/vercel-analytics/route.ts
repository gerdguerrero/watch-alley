import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";

export const runtime = "nodejs";

type VercelObservabilityRow = {
  timestamp?: string;
  vercel_analytics_pageview_count_sum?: number;
};

type VercelObservabilityResponse = {
  data?: VercelObservabilityRow[];
};

// Watch Alley lives under the Hype Kidz Vercel team. The previous value was
// Joseph's paused personal team, which made Vercel return 404/403 for this
// project and left the admin analytics tab stuck in a skeleton state.
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_cGwnjCC7Oe9hTbIrF1ktGS1L";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_h4BRq8PsNM6c7rktxnszWB7PRDC9";
const VERCEL_PROJECT_NAME = "watch-alley";
const VERCEL_ANALYTICS_METRIC = "vercel.analytics_pageview.count";
const VERCEL_OBSERVABILITY_URL = "https://api.vercel.com/v2/observability/query";

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

function toVercelDateParam(date: Date) {
  return `${isoDate(date)}T00:00:00.000Z`;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
  const range = params.get("range") || "last7";

  if (range === "custom") {
    const fromParam = parseDateParam(params.get("from"));
    const toParam = parseDateParam(params.get("to"));
    if (fromParam && toParam && fromParam <= toParam) {
      const days = Math.max(
        1,
        Math.round((toParam.valueOf() - fromParam.valueOf()) / 86_400_000) + 1
      );
      return { key: range, from: fromParam, to: toParam, days };
    }
  }

  const daysByRange: Record<string, number> = {
    last7: 7,
    last14: 14,
    last30: 30,
    last90: 90,
  };
  const days = daysByRange[range] ?? daysByRange.last7;
  return {
    key: range in daysByRange ? range : "last7",
    from: addDays(today, -days),
    to: today,
    days: days + 1,
  };
}

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Not authorized." },
      { status: 401 }
    );
  }

  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_AUTH_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Vercel analytics token is not configured. Set VERCEL_API_TOKEN in the Vercel project environment.",
      },
      { status: 500 }
    );
  }

  const now = new Date();
  const range = resolveRange(request);
  const previousFrom = addDays(range.from, -range.days);
  const queryTo = addDays(range.to, 1);

  const response = await fetch(
    `${VERCEL_OBSERVABILITY_URL}?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: {
          type: "project",
          ownerId: VERCEL_TEAM_ID,
          projectIds: [VERCEL_PROJECT_ID],
        },
        metric: VERCEL_ANALYTICS_METRIC,
        aggregation: "sum",
        startTime: toVercelDateParam(previousFrom),
        endTime: toVercelDateParam(queryTo),
        granularity: { days: 1 },
        limit: 10,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        message: `Vercel analytics request failed (${response.status}).`,
        detail: message.slice(0, 500),
      },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as VercelObservabilityResponse;
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const byDate = new Map<string, { pageviews: number; events: number; total: number }>();

  for (const row of rows) {
    if (!row.timestamp) continue;
    const date = row.timestamp.slice(0, 10);
    const pageviews = numberValue(row.vercel_analytics_pageview_count_sum);
    byDate.set(date, {
      pageviews,
      events: 0,
      total: pageviews,
    });
  }

  function buildSeries(start: Date, length: number) {
    return Array.from({ length }, (_, index) => {
      const date = isoDate(addDays(start, index));
      const value = byDate.get(date) ?? { pageviews: 0, events: 0, total: 0 };
      return { date, ...value };
    });
  }

  const series = buildSeries(range.from, range.days);
  const previousSeries = buildSeries(previousFrom, range.days);
  const totalPageviews = series.reduce((sum, day) => sum + day.pageviews, 0);
  const previousPageviews = previousSeries.reduce((sum, day) => sum + day.pageviews, 0);
  const totalEvents = series.reduce((sum, day) => sum + day.events, 0);
  const total = series.reduce((sum, day) => sum + day.total, 0);
  const todayRow = series.at(-1) ?? { pageviews: 0, events: 0, total: 0 };

  return NextResponse.json({
    ok: true,
    project: {
      id: VERCEL_PROJECT_ID,
      name: VERCEL_PROJECT_NAME,
      domain: "thewatchalley.com",
    },
    range: {
      key: range.key,
      from: isoDate(range.from),
      to: isoDate(range.to),
      days: series.length,
      previousFrom: isoDate(previousFrom),
      previousTo: isoDate(addDays(range.from, -1)),
    },
    summary: {
      totalPageviews,
      totalEvents,
      total,
      selectedPageviews: totalPageviews,
      previousPageviews,
      todayPageviews: todayRow.pageviews,
      averageDailyPageviews: Math.round(totalPageviews / series.length),
    },
    series,
    previousSeries,
    updatedAt: now.toISOString(),
  });
}
