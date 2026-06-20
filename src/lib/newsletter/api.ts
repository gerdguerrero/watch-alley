import "server-only";
import { NextResponse } from "next/server";

export function jsonOk(payload: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...payload });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function readJsonObject(request: Request) {
  try {
    const payload = await request.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function requireCronSecret(request: Request) {
  const expected = process.env.NEWSLETTER_CRON_SECRET || process.env.CRON_SECRET;
  if (!expected) {
    throw new Error("NEWSLETTER_CRON_SECRET or CRON_SECRET is not configured.");
  }

  const auth = request.headers.get("authorization");
  const queryToken = new URL(request.url).searchParams.get("token");
  if (auth !== `Bearer ${expected}` && queryToken !== expected) {
    throw new Error("Unauthorized cron request.");
  }
}
