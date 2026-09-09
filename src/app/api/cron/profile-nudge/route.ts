import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";
import { isRateLimitError, nudgeAgeWindowHours, nudgeRunLimit } from "@/lib/newsletter/limits";
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

  // The window used to be a hard 24-48 hours, which meant a subscriber was
  // reachable for exactly one day of their life. Anyone who signed up before
  // this cron existed, or during any day it did not run, could never be asked
  // for their preferences again: in September 2026 that was 495 of 550
  // subscribers, and preferences are the one field the segmentation needs.
  // The RPC's own `profile_nudge_sent_at is null` guard already prevents a
  // second nudge, so the window can safely be as wide as the list is old.
  const window = nudgeAgeWindowHours();
  const { data: targets, error: rpcError } = await supabase.rpc(
    "service_get_profile_nudge_candidates",
    {
      min_age_hours: window.min,
      max_age_hours: window.max,
    }
  );

  if (rpcError) {
    return jsonError(`Failed to fetch targets: ${rpcError.message}`, 500);
  }

  const candidateRows = (targets as CandidateRow[]) || [];

  // A widened window means the first run faces a backlog of hundreds. Take a
  // small slice per day so the nudges never eat the newsletter's share of the
  // same daily allowance; the rest are picked up on subsequent runs.
  const runLimit = nudgeRunLimit();
  const batch = candidateRows.slice(0, runLimit);
  const deferred = candidateRows.length - batch.length;

  if (preview) {
    return jsonOk({
      preview: true,
      targetsCount: candidateRows.length,
      windowHours: window,
      runLimit,
      wouldSend: batch.length,
      deferred,
      targets: batch.map((t) => ({
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
  let rateLimited = false;
  const errors: string[] = [];

  for (const sub of batch) {
    try {
      await sendProfileCompletionEmail(sub.email, sub.first_name || undefined, sub.missing_fields);

      // Record that we sent the nudge to prevent duplicate sends
      const { error: updateError } = await supabase.rpc("service_mark_profile_nudge_sent", {
        subscriber_id: sub.id,
      });

      if (updateError) {
        // This mark is the only thing stopping a repeat. While the window was
        // 24-48 hours a failure here cost one extra email; with the window
        // widened to the whole list, an unmarked subscriber becomes a
        // candidate again every single day, forever. Stop the run rather than
        // risk a systemic marking failure mailing the list daily.
        console.error(
          `Failed to mark profile nudge sent for subscriber ${sub.email}:`,
          updateError.message
        );
        errors.push(`${sub.email}: nudge sent but not recorded (${updateError.message})`);
        sentCount++;
        break;
      }

      sentCount++;
      // Rate-limiting delay to be gentle on Resend quota
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // A rate or quota refusal is not this subscriber's fault and not
      // permanent. Stop the run without marking them nudged, so they are
      // still a candidate tomorrow.
      if (isRateLimitError(err)) {
        rateLimited = true;
        break;
      }
      errors.push(`${sub.email}: ${errMsg}`);
      console.error(`Failed to send profile completion nudge to ${sub.email}:`, errMsg);
    }
  }

  const outstanding = candidateRows.length - sentCount;
  const summary = rateLimited
    ? `Provider rate limit reached after ${sentCount} nudges. ${outstanding} remain for the next run.`
    : outstanding > 0
      ? `Nudged ${sentCount} subscribers. ${outstanding} remain for the next run.`
      : `Successfully nudged ${sentCount} subscribers.`;

  return jsonOk({
    sent: sentCount,
    targetsCount: candidateRows.length,
    attempted: batch.length,
    outstanding,
    rateLimited,
    configured: true,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? `${summary} Errors: ${errors.join(", ")}` : summary,
  });
}
