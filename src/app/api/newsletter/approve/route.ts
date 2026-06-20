import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { jsonError, jsonOk, readJsonObject } from "@/lib/newsletter/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof assertAdmin>>;
  try {
    admin = await assertAdmin(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Not authorized.", 401);
  }

  const body = await readJsonObject(request);
  const issueId = typeof body?.issueId === "string" ? body.issueId : "";
  if (!issueId) return jsonError("issueId is required.");

  const { data, error } = await admin.supabase.rpc("admin_update_newsletter_issue_status", {
    issue_id: issueId,
    new_status: "approved",
    scheduled_for: null,
    archive_public: null,
  });

  if (error) return jsonError(error.message, 500);
  return jsonOk({ issue: data });
}
