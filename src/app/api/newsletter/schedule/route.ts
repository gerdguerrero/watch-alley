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
  const scheduledAt = typeof body?.scheduledAt === "string" ? body.scheduledAt : "";
  if (!issueId || !scheduledAt) return jsonError("issueId and scheduledAt are required.");

  const { data, error } = await admin.supabase.rpc("admin_update_newsletter_issue_status", {
    issue_id: issueId,
    new_status: "scheduled",
    scheduled_for: scheduledAt,
    archive_public: null,
  });

  if (error) return jsonError(error.message, 500);
  return jsonOk({ issue: data });
}
