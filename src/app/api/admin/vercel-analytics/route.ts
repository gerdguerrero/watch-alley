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
  const today = startOfUtcDay(now);
  const from = addDays(today, -29);
  const to = addDays(today, 1);

  const params = new URLSearchParams({
    teamId: VERCEL_TEAM_ID,
    from: toVercelDateParam(from),
    to: toVercelDateParam(to),
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

  const series = Array.from({ length: 30 }, (_, index) => {
    const date = isoDate(addDays(from, index));
    const value = byDate.get(date) ?? { pageviews: 0, events: 0, total: 0 };
    return { date, ...value };
  });

  const totalPageviews = series.reduce((sum, day) => sum + day.pageviews, 0);
  const totalEvents = series.reduce((sum, day) => sum + day.events, 0);
  const total = series.reduce((sum, day) => sum + day.total, 0);
  const last7 = series.slice(-7).reduce((sum, day) => sum + day.pageviews, 0);
  const previous7 = series.slice(-14, -7).reduce((sum, day) => sum + day.pageviews, 0);
  const todayRow = series.at(-1) ?? { pageviews: 0, events: 0, total: 0 };

  return NextResponse.json({
    ok: true,
    project: {
      id: VERCEL_PROJECT_ID,
      name: VERCEL_PROJECT_NAME,
      domain: "thewatchalley.com",
    },
    range: {
      from: isoDate(from),
      to: isoDate(today),
      days: series.length,
    },
    summary: {
      totalPageviews,
      totalEvents,
      total,
      last7Pageviews: last7,
      previous7Pageviews: previous7,
      todayPageviews: todayRow.pageviews,
      averageDailyPageviews: Math.round(totalPageviews / series.length),
    },
    series,
    updatedAt: now.toISOString(),
  });
}
