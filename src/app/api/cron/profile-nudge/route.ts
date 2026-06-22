import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";
import { sendProfileCompletionEmail } from "@/lib/newsletter/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type CandidateRow = {
  id: string;
  email: string;
  first_name: string;
  country: string;
  created_at: string;
  missing_fields: string[];
};

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized.", 401);
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "true";

  const supabase = createSupabaseAdminClient();

  // Query candidates (joined 24-48 hours ago, status active, nudge not sent, missing profile fields)
  // using the secure database RPC.
  const { data: targets, error: rpcError } = await supabase.rpc(
    "service_get_profile_nudge_candidates",
    {
      min_age_hours: 24,
      max_age_hours: 48,
    }
  );

  if (rpcError) {
    return jsonError(`Failed to fetch targets: ${rpcError.message}`, 500);
  }

  const candidateRows = (targets as CandidateRow[]) || [];

  if (preview) {
    return jsonOk({
      preview: true,
      targetsCount: candidateRows.length,
      targets: candidateRows.map((t) => ({
        email: t.email,
        firstName: t.first_name || null,
        country: t.country || null,
        createdAt: t.created_at,
        missingFields: t.missing_fields,
      })),
    });
  }

  const providerConfigured = Boolean(process.env.RESEND_API_KEY);
  if (!providerConfigured) {
    return jsonOk({
      sent: 0,
      targetsCount: candidateRows.length,
      configured: false,
      message: "Email provider (Resend) is not configured. Profile completion emails were skipped.",
    });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const sub of candidateRows) {
    try {
      await sendProfileCompletionEmail(sub.email, sub.first_name || undefined, sub.missing_fields);

      // Record that we sent the nudge to prevent duplicate sends
      const { error: updateError } = await supabase.rpc("service_mark_profile_nudge_sent", {
        subscriber_id: sub.id,
      });

      if (updateError) {
        console.error(
          `Failed to mark profile nudge sent for subscriber ${sub.email}:`,
          updateError.message
        );
      }

      sentCount++;
      // Rate-limiting delay to be gentle on Resend quota
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${sub.email}: ${errMsg}`);
      console.error(`Failed to send profile completion nudge to ${sub.email}:`, errMsg);
    }
  }

  return jsonOk({
    sent: sentCount,
    targetsCount: candidateRows.length,
    configured: true,
    errors: errors.length > 0 ? errors : undefined,
    message:
      errors.length > 0
        ? `Nudged ${sentCount}/${candidateRows.length} subscribers. Errors: ${errors.join(", ")}`
        : `Successfully nudged ${sentCount} subscribers.`,
  });
}
