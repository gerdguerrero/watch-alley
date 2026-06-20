import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { jsonError, jsonOk, readJsonObject } from "@/lib/newsletter/api";
import { sendTestEmail } from "@/lib/newsletter/send";

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
  const recipient = typeof body?.recipient === "string" ? body.recipient : "";
  if (!issueId || !recipient) return jsonError("issueId and recipient are required.");

  const providerConfigured = Boolean(process.env.RESEND_API_KEY);
  if (!providerConfigured) {
    await admin.supabase.rpc("admin_log_newsletter_send", {
      payload: {
        issueId,
        provider: "resend",
        status: "skipped",
        recipientCount: 1,
        errorMessage: "RESEND_API_KEY is not configured.",
        metadata: { recipient, mode: "test" },
      },
    });
    return jsonOk({
      sent: false,
      configured: false,
      message: "Email provider is not configured. Test send was logged as skipped.",
    });
  }

  try {
    const result = await sendTestEmail(issueId, recipient);
    await admin.supabase.rpc("admin_log_newsletter_send", {
      payload: {
        issueId,
        provider: "resend",
        status: "test_sent",
        recipientCount: 1,
        metadata: { recipient, mode: "test", result },
      },
    });
    return jsonOk({
      sent: true,
      configured: true,
      message: `Test email sent to ${recipient}.`,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await admin.supabase.rpc("admin_log_newsletter_send", {
      payload: {
        issueId,
        provider: "resend",
        status: "failed",
        recipientCount: 1,
        errorMessage: errMsg,
        metadata: { recipient, mode: "test" },
      },
    });
    return jsonError(`Test sending failed: ${errMsg}`, 500);
  }
}
