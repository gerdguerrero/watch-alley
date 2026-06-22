import { NextResponse } from "next/server";
import { sendProfileCompletionEmail } from "@/lib/newsletter/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  country: string | null;
  has_preferences: boolean;
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

  let query = supabase
    .schema("watch_alley")
    .from("watch_list_subscribers")
    .select("id, email, first_name, country")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (filter === "email-only") {
    query = query.or("first_name.is.null,country.is.null");
  }

  const { data: subscribers, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, message: `Failed to fetch subscribers: ${error.message}` },
      { status: 500 }
    );
  }

  // Check which subscribers have preferences (separate query to avoid join complexity)
  const subscriberIds = (subscribers || []).map((s) => s.id);
  let prefSubIds = new Set<string>();
  if (subscriberIds.length > 0) {
    const { data: prefs, error: prefError } = await supabase
      .schema("watch_alley")
      .from("watch_list_preferences")
      .select("subscriber_id")
      .in("subscriber_id", subscriberIds);

    if (!prefError && prefs) {
      prefSubIds = new Set(prefs.map((p) => p.subscriber_id));
    }
  }

  const enriched = (subscribers || []).map((s) => ({
    id: s.id,
    email: s.email,
    first_name: s.first_name,
    country: s.country,
    has_preferences: prefSubIds.has(s.id),
    missingFields: [
      ...(!s.first_name ? ["First name"] : []),
      ...(!s.country ? ["Country"] : []),
      ...(!prefSubIds.has(s.id) ? ["Watch preferences (brands, budget)"] : []),
    ],
  }));

  let targets = enriched;
  if (filter === "no-preferences") {
    targets = enriched.filter((s) => !s.has_preferences);
  }

  if (preview) {
    return NextResponse.json({
      ok: true,
      preview: true,
      count: targets.length,
      subscribers: targets.map((s) => ({
        email: s.email,
        firstName: s.first_name,
        country: s.country,
        hasPreferences: s.has_preferences,
        missingFields: s.missingFields,
      })),
    });
  }

  // SEND mode
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No matching subscribers found." });
  }

  const errors: string[] = [];
  let sentCount = 0;

  for (const sub of targets) {
    try {
      await sendProfileCompletionEmail(sub.email, sub.first_name ?? undefined, sub.missingFields);
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
    total: targets.length,
    errors: errors.length > 0 ? errors : undefined,
    message:
      errors.length > 0
        ? `Sent ${sentCount}/${targets.length}. ${errors.length} failed.`
        : `Sent ${sentCount} profile update emails.`,
  });
}
