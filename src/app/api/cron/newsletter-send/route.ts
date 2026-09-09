import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";
import { broadcastRunLimit } from "@/lib/newsletter/limits";
import { sendNewsletterBroadcast } from "@/lib/newsletter/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Broadcasts are batched (50/request) but delivery logging is per-recipient;
// give the cron the full Fluid Compute window so a large list finishes in one run.
export const maxDuration = 300;

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

  let completed = 0;
  let emailsSent = 0;
  let capped = false;
  const errors: string[] = [];

  // One allowance for the whole run, spent across however many issues are due.
  // Counting per issue instead would let three due issues send three times the
  // daily quota, and the emails past it come back refused.
  let budget = broadcastRunLimit();

  for (const issue of due) {
    if (budget <= 0) {
      capped = true;
      break;
    }

    try {
      const result = await sendNewsletterBroadcast(issue.id, { maxEmails: budget });
      emailsSent += result.sent;
      budget -= result.sent;
      if (result.capped) {
        capped = true;
      } else {
        completed++;
      }
    } catch (err) {
      // The broadcast only throws when nothing was delivered, so the budget is
      // untouched and the next due issue can still have it.
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const summary = capped
    ? `Budget reached after ${emailsSent} emails. ${completed} issues finished; the rest resume on the next run.`
    : `Successfully sent ${completed} scheduled issues (${emailsSent} emails).`;

  return jsonOk({
    sent: completed,
    emailsSent,
    capped,
    due: due.length,
    configured: true,
    message: errors.length > 0 ? `${summary} Errors: ${errors.join(", ")}` : summary,
  });
}
