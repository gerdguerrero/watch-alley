import "server-only";
import { NextResponse } from "next/server";

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
};

export function jsonOk(payload: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...payload }, { headers: PRIVATE_NO_STORE });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status, headers: PRIVATE_NO_STORE });
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
  const allowedSecrets = [process.env.NEWSLETTER_CRON_SECRET, process.env.CRON_SECRET].filter(
    Boolean
  );
  if (allowedSecrets.length === 0) {
    throw new Error("NEWSLETTER_CRON_SECRET or CRON_SECRET is not configured.");
  }

  // Header-only on purpose: query-string secrets leak into request logs and
  // referrer headers. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const auth = request.headers.get("authorization");
  const bearerToken = auth?.replace(/^Bearer\s+/i, "").trim();
  if (!bearerToken || !allowedSecrets.includes(bearerToken)) {
    throw new Error("Unauthorized cron request.");
  }
}
