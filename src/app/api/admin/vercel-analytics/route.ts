import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";

export const runtime = "nodejs";
export const maxDuration = 10;

type VercelObservabilityRow = {
  timestamp?: string;
  vercel_analytics_pageview_count_sum?: number;
  vercel_analytics_pageview_count_unique_visitor_id?: number;
};

type VercelObservabilityResponse = {
  data?: VercelObservabilityRow[];
  summary?: VercelObservabilityRow[];
};

// Watch Alley lives under the Hype Kidz Vercel team. The previous value was
// Joseph's paused personal team, which made Vercel return 404/403 for this
// project and left the admin analytics tab stuck in a skeleton state.
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_cGwnjCC7Oe9hTbIrF1ktGS1L";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_h4BRq8PsNM6c7rktxnszWB7PRDC9";
const VERCEL_PROJECT_NAME = "watch-alley";
const VERCEL_ANALYTICS_METRIC = "vercel.analytics_pageview.count";
const VERCEL_OBSERVABILITY_URL = "https://api.vercel.com/v2/observability/query";
const VERCEL_REQUEST_TIMEOUT_MS = 8_000;
const JSON_NO_STORE = {
  "Cache-Control": "private, no-store",
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: JSON_NO_STORE });
}

function vercelAnalyticsValue(
  row: VercelObservabilityRow,
  aggregation: "sum" | "unique/visitor_id"
) {
  return aggregation === "unique/visitor_id"
    ? numberValue(row.vercel_analytics_pageview_count_unique_visitor_id)
    : numberValue(row.vercel_analytics_pageview_count_sum);
}

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
    return json(
      { ok: false, message: error instanceof Error ? error.message : "Not authorized." },
      401
    );
  }

  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_AUTH_TOKEN;
  if (!token) {
    return json(
      {
        ok: false,
        message:
          "Vercel analytics token is not configured. Set VERCEL_API_TOKEN in the Vercel project environment.",
      },
      500
    );
  }

  const now = new Date();
  const range = resolveRange(request);
  const previousFrom = addDays(range.from, -range.days);
  const queryTo = addDays(range.to, 1);

  async function queryVercelAnalytics(aggregation: "sum" | "unique/visitor_id") {
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
          aggregation,
          startTime: toVercelDateParam(previousFrom),
          endTime: toVercelDateParam(queryTo),
          granularity: { days: 1 },
          limit: 10,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(VERCEL_REQUEST_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(
        JSON.stringify({
          status: response.status,
          detail: message.slice(0, 500),
        })
      );
    }

    const payload = (await response.json()) as VercelObservabilityResponse;
    return {
      rows: Array.isArray(payload.data) ? payload.data : [],
      summary: Array.isArray(payload.summary) ? (payload.summary[0] ?? {}) : {},
    };
  }

  let pageviewRows: VercelObservabilityRow[] = [];
  let visitorRows: VercelObservabilityRow[] = [];
  let visitorSummary: VercelObservabilityRow = {};
  try {
    const [pageviewResult, visitorResult] = await Promise.all([
      queryVercelAnalytics("sum"),
      queryVercelAnalytics("unique/visitor_id"),
    ]);
    pageviewRows = pageviewResult.rows;
    visitorRows = visitorResult.rows;
    visitorSummary = visitorResult.summary;
  } catch (error) {
    let status = 502;
    let detail = "";
    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message) as { status?: number; detail?: string };
        status = parsed.status ?? status;
        detail = parsed.detail ?? "";
      } catch {
        detail = error.message;
      }
    }
    return json(
      {
        ok: false,
        message: `Vercel analytics request failed (${status}).`,
        detail,
      },
      502
    );
  }

  const byDate = new Map<string, { pageviews: number; events: number; total: number }>();
  const visitorsByDate = new Map<string, number>();

  for (const row of pageviewRows) {
    if (!row.timestamp) continue;
    const date = row.timestamp.slice(0, 10);
    const pageviews = vercelAnalyticsValue(row, "sum");
    byDate.set(date, {
      pageviews,
      events: 0,
      total: pageviews,
    });
  }

  for (const row of visitorRows) {
    if (!row.timestamp) continue;
    visitorsByDate.set(row.timestamp.slice(0, 10), vercelAnalyticsValue(row, "unique/visitor_id"));
  }

  function buildSeries(start: Date, length: number) {
    return Array.from({ length }, (_, index) => {
      const date = isoDate(addDays(start, index));
      const value = byDate.get(date) ?? { pageviews: 0, events: 0, total: 0 };
      return { date, ...value };
    });
  }

  function buildVisitorSeries(start: Date, length: number) {
    return Array.from({ length }, (_, index) => {
      const date = isoDate(addDays(start, index));
      return { date, visitors: visitorsByDate.get(date) ?? 0 };
    });
  }

  const series = buildSeries(range.from, range.days);
  const previousSeries = buildSeries(previousFrom, range.days);
  const visitorSeries = buildVisitorSeries(range.from, range.days);
  const totalPageviews = series.reduce((sum, day) => sum + day.pageviews, 0);
  const previousPageviews = previousSeries.reduce((sum, day) => sum + day.pageviews, 0);
  const totalEvents = series.reduce((sum, day) => sum + day.events, 0);
  const total = series.reduce((sum, day) => sum + day.total, 0);
  const uniqueVisitors =
    vercelAnalyticsValue(visitorSummary, "unique/visitor_id") ||
    visitorSeries.reduce((sum, day) => sum + day.visitors, 0);
  const todayRow = series.at(-1) ?? { pageviews: 0, events: 0, total: 0 };

  return json({
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
      uniqueVisitors,
    },
    series,
    previousSeries,
    visitorSeries,
    updatedAt: now.toISOString(),
  });
}
