import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand ISR revalidation endpoint.
 *
 * Called by the admin panel after mutations (save, delete, mark-sold)
 * so the storefront reflects changes instantly instead of waiting for
 * the 60-second time-based revalidation window.
 *
 * POST /api/revalidate
 * Body: { paths: string[] }
 * Header: Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.REVALIDATION_TOKEN;

  if (!expected) {
    return NextResponse.json({ error: "REVALIDATION_TOKEN not configured" }, { status: 500 });
  }

  if (!auth || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let paths: string[];
  try {
    const body = await request.json();
    paths = Array.isArray(body.paths) ? body.paths : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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
