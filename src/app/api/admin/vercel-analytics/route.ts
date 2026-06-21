import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";

export const runtime = "nodejs";

type VercelUsageRow = {
  timestamp?: string;
  projectName?: string;
  projectId?: string;
  count?: number;
  eventCount?: number;
  pageviewCount?: number;
};

const VERCEL_TEAM_ID = "team_fdiNWLh4i3WbFcIC2f41ucFK";
const VERCEL_PROJECT_ID = "prj_h4BRq8PsNM6c7rktxnszWB7PRDC9";
const VERCEL_PROJECT_NAME = "watch-alley";
const VERCEL_ANALYTICS_URL = "https://vercel.com/api/v1/usage/analytics";

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

  const params = new URLSearchParams({
    teamId: VERCEL_TEAM_ID,
    projectId: VERCEL_PROJECT_ID,
    from: toVercelDateParam(previousFrom),
    to: toVercelDateParam(queryTo),
  });

  const response = await fetch(`${VERCEL_ANALYTICS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

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

  const rows = (await response.json()) as VercelUsageRow[];
  const byDate = new Map<string, { pageviews: number; events: number; total: number }>();

  for (const row of rows) {
    if (row.projectId !== VERCEL_PROJECT_ID && row.projectName !== VERCEL_PROJECT_NAME) continue;
    if (!row.timestamp) continue;
    const date = row.timestamp.slice(0, 10);
    byDate.set(date, {
      pageviews: numberValue(row.pageviewCount),
      events: numberValue(row.eventCount),
      total: numberValue(row.count),
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
    updatedAt: now.toISOString(),
  });
}
