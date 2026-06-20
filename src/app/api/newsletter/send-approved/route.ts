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

  await admin.supabase.rpc("admin_log_newsletter_send", {
    payload: {
      issueId,
      provider: process.env.RESEND_API_KEY ? "resend" : "not-configured",
      status: "skipped",
      recipientCount: 0,
      errorMessage:
        "Manual send is disabled until provider credentials and approval UX are finalized.",
      metadata: { mode: "send-approved" },
    },
  });

  return jsonOk({
    sent: false,
    message: "Approved sending is scaffolded but disabled in this approval branch.",
  });
}
