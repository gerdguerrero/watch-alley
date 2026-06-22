import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { jsonError, jsonOk, readJsonObject } from "@/lib/newsletter/api";
import { sendNewsletterBroadcast } from "@/lib/newsletter/send";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const providerConfigured = Boolean(process.env.RESEND_API_KEY);
  if (!providerConfigured) {
    await admin.supabase.rpc("admin_log_newsletter_send", {
      payload: {
        issueId,
        provider: "resend",
        status: "skipped",
        recipientCount: 0,
        errorMessage: "RESEND_API_KEY is not configured.",
        metadata: { mode: "send-approved" },
      },
    });
    return jsonOk({
      sent: false,
      message: "Email provider is not configured. Approved send was logged as skipped.",
    });
  }

  try {
    const result = await sendNewsletterBroadcast(issueId);
    await admin.supabase.rpc("admin_log_newsletter_send", {
      payload: {
        issueId,
        provider: "resend",
        status: "sent",
        recipientCount: result.sent,
        metadata: { mode: "send-approved", result },
      },
    });
    return jsonOk({
      sent: true,
      recipientCount: result.sent,
      message: result.message,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await admin.supabase.rpc("admin_log_newsletter_send", {
      payload: {
        issueId,
        provider: "resend",
        status: "failed",
        errorMessage: errMsg,
        metadata: { mode: "send-approved" },
      },
    });
    return jsonError(`Failed to send approved newsletter: ${errMsg}`, 500);
  }
}
