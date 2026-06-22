import { NextResponse } from "next/server";
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
 * GET /api/newsletter/send-profile-update?filter=email-only|no-preferences|all&preview=true
 *
 * - preview=true: returns the list of subscribers who would receive the email,
 *   without sending anything.
 * - filter: which subset of active subscribers to target.
 *   - "email-only": first_name IS NULL OR country IS NULL
 *   - "no-preferences": no row in watch_list_preferences
 *   - "all": all active subscribers (default)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";
  const preview = url.searchParams.get("preview") === "true";

  const supabase = createSupabaseAdminClient();

  // Query target candidates using the secure database RPC.
  const { data: targets, error: rpcError } = await supabase.rpc(
    "service_get_manual_profile_nudge_candidates",
    {
      filter_type: filter,
    }
  );

  if (rpcError) {
    return NextResponse.json(
      { ok: false, message: `Failed to fetch subscribers: ${rpcError.message}` },
      { status: 500 }
    );
  }

  const candidateRows = (targets as CandidateRow[]) || [];

  if (preview) {
    return NextResponse.json({
      ok: true,
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

  // SEND mode
  if (candidateRows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No matching subscribers found." });
  }

  const errors: string[] = [];
  let sentCount = 0;

  for (const sub of candidateRows) {
    try {
      await sendProfileCompletionEmail(sub.email, sub.first_name || undefined, sub.missing_fields);

      // Record that we sent the nudge to prevent duplicate sends by the automated cron
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
      // Small delay between sends to respect Resend rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${sub.email}: ${msg}`);
      console.error(`Failed to send profile update to ${sub.email}:`, msg);
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    total: candidateRows.length,
    errors: errors.length > 0 ? errors : undefined,
    message:
      errors.length > 0
        ? `Sent ${sentCount}/${candidateRows.length}. ${errors.length} failed.`
        : `Sent ${sentCount} profile update emails.`,
  });
}
