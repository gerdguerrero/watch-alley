import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";

/**
 * On-demand ISR revalidation endpoint.
 *
 * Called by the admin panel after mutations (save, delete, mark-sold)
 * so the storefront reflects changes instantly instead of waiting for
 * the 60-second time-based revalidation window.
 *
 * POST /api/revalidate
 * Body: { paths: string[] }
 * Header: Authorization: Bearer <admin Supabase access token>
 *         (or the server-only REVALIDATION_TOKEN for scripts)
 */
const MAX_PATHS = 50;

function matchesRevalidationToken(bearer: string) {
  const expected = process.env.REVALIDATION_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(bearer);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const bearer =
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ?? "";

  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Server-side scripts may use the static env token; the admin panel sends
  // its Supabase session token, verified against the admin_emails allowlist.
  if (!matchesRevalidationToken(bearer)) {
    try {
      await assertAdmin(request);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let paths: string[];
  try {
    const body = await request.json();
    paths = Array.isArray(body.paths) ? body.paths : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  paths = paths
    .filter((path): path is string => typeof path === "string" && path.startsWith("/"))
    .slice(0, MAX_PATHS);

  if (paths.length === 0) {
    return NextResponse.json({ revalidated: [] });
  }

  const results: { path: string; status: "ok" | "error"; error?: string }[] = [];

  for (const path of paths) {
    try {
      revalidatePath(path);
      results.push({ path, status: "ok" });
    } catch (err) {
      results.push({ path, status: "error", error: String(err) });
    }
  }

  return NextResponse.json({ revalidated: results });
}
