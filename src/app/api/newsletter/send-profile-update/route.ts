import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";
import { sendProfileCompletionEmail } from "@/lib/newsletter/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CandidateRow = {
  id: string;
  email: string;
  first_name: string;
  country: string;
  created_at: string;
  missing_fields: string[];
};

/**
 * GET /api/newsletter/send-profile-update?filter=all|email-only|no-preferences&preview=true
 *
 * Protected by CRON_SECRET (same as the automated cron jobs).
 *
 * - preview=true: returns the list of subscribers who would receive the email,
 *   without sending anything.
 * - filter: which subset of active subscribers to target.
 *   - "all": all active subscribers regardless of profile completeness (default)
 *   - "email-only": first_name IS NULL OR country IS NULL
 *   - "no-preferences": no row in watch_list_preferences
 *
 * Also marks subscribers as "nudge sent" so the automated cron (24-48h) won't
 * duplicate-nudge them later.
 */
export async function GET(request: Request) {
  try {
    requireCronSecret(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized.", 401);
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";
  const preview = url.searchParams.get("preview") === "true";

  const supabase = createSupabaseAdminClient();

  const { data: targets, error: rpcError } = await supabase.rpc(
    "service_get_manual_profile_nudge_candidates",
    { filter_type: filter }
  );

  if (rpcError) {
    return jsonError(`Failed to fetch subscribers: ${rpcError.message}`, 500);
  }

  const candidateRows = (targets as CandidateRow[]) || [];

  if (preview) {
    return jsonOk({
      preview: true,
      count: candidateRows.length,
      subscribers: candidateRows.map((s) => ({
        email: s.email,
        firstName: s.first_name || null,
        country: s.country || null,
        createdAt: s.created_at,
        missingFields: s.missing_fields,
      })),
    });
  }

  if (candidateRows.length === 0) {
    return jsonOk({ sent: 0, message: "No matching subscribers found." });
  }

  const providerConfigured = Boolean(process.env.RESEND_API_KEY);
  if (!providerConfigured) {
    return jsonOk({
      sent: 0,
      count: candidateRows.length,
      configured: false,
      message: "Email provider (Resend) is not configured. Emails were skipped.",
    });
  }

  const errors: string[] = [];
  let sentCount = 0;

  for (const sub of candidateRows) {
    try {
      await sendProfileCompletionEmail(sub.email, sub.first_name || undefined, sub.missing_fields);

      // Mark nudge sent so the automated cron won't duplicate
      const { error: updateError } = await supabase.rpc("service_mark_profile_nudge_sent", {
        subscriber_id: sub.id,
      });

      if (updateError) {
        console.error(
          `Failed to mark profile nudge sent for subscriber ${sub.email}:`,
          updateError.message
        );
      }

      sentCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${sub.email}: ${msg}`);
      console.error(`Failed to send profile update to ${sub.email}:`, msg);
    }
  }

  return jsonOk({
    sent: sentCount,
    total: candidateRows.length,
    configured: true,
    errors: errors.length > 0 ? errors : undefined,
    message:
      errors.length > 0
        ? `Sent ${sentCount}/${candidateRows.length}. ${errors.length} failed.`
        : `Sent ${sentCount} profile update emails.`,
  });
}
