import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";
import { sendNewsletterBroadcast } from "@/lib/newsletter/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized.", 401);
  }

  const providerConfigured = Boolean(process.env.RESEND_API_KEY);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("service_list_due_newsletter_issues", {
    limit_count: 10,
  });

  if (error) return jsonError(error.message, 500);

  const due = Array.isArray(data) ? (data as { id: string }[]) : [];
  if (!providerConfigured) {
    return jsonOk({
      sent: 0,
      due: due.length,
      configured: false,
      message: "Email provider is not configured. No scheduled issues were sent.",
    });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const issue of due) {
    try {
      await sendNewsletterBroadcast(issue.id);
      sentCount++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return jsonOk({
    sent: sentCount,
    due: due.length,
    configured: true,
    message:
      errors.length > 0
        ? `Completed with errors. Sent ${sentCount} of ${due.length} issues. Errors: ${errors.join(", ")}`
        : `Successfully sent ${sentCount} scheduled issues.`,
  });
}
