import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

  const due = Array.isArray(data) ? data : [];
  if (!providerConfigured) {
    return jsonOk({
      sent: 0,
      due: due.length,
      configured: false,
      message: "Email provider is not configured. No scheduled issues were sent.",
    });
  }

  return jsonOk({
    sent: 0,
    due: due.length,
    configured: true,
    message: "Provider detected, but automated sending is disabled in this approval branch.",
  });
}
