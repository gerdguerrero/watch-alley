import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// ISO-3166-1 alpha-2 → country name mapping (top 60 by population)
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AO: "Angola", AR: "Argentina",
  AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan", BD: "Bangladesh",
  BE: "Belgium", BO: "Bolivia", BR: "Brazil", BG: "Bulgaria", KH: "Cambodia",
  CM: "Cameroon", CA: "Canada", CL: "Chile", CN: "China", CO: "Colombia",
  CD: "DR Congo", CR: "Costa Rica", CI: "Côte d'Ivoire", HR: "Croatia", CU: "Cuba",
  CZ: "Czechia", DK: "Denmark", DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt",
  SV: "El Salvador", ET: "Ethiopia", FI: "Finland", FR: "France", DE: "Germany",
  GH: "Ghana", GR: "Greece", GT: "Guatemala", HN: "Honduras", HK: "Hong Kong",
  HU: "Hungary", IN: "India", ID: "Indonesia", IR: "Iran", IQ: "Iraq", IE: "Ireland",
  IL: "Israel", IT: "Italy", JP: "Japan", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya",
  KW: "Kuwait", LB: "Lebanon", MY: "Malaysia", MX: "Mexico", MA: "Morocco",
  MM: "Myanmar", NL: "Netherlands", NZ: "New Zealand", NG: "Nigeria", KP: "North Korea",
  NO: "Norway", PK: "Pakistan", PE: "Peru", PH: "Philippines", PL: "Poland",
  PT: "Portugal", QA: "Qatar", RO: "Romania", RU: "Russia", SA: "Saudi Arabia",
  RS: "Serbia", SG: "Singapore", SK: "Slovakia", ZA: "South Africa", KR: "South Korea",
  ES: "Spain", LK: "Sri Lanka", SE: "Sweden", CH: "Switzerland", SY: "Syria",
  TW: "Taiwan", TH: "Thailand", TN: "Tunisia", TR: "Turkey", UA: "Ukraine",
  AE: "United Arab Emirates", GB: "United Kingdom", US: "United States", UY: "Uruguay",
  UZ: "Uzbekistan", VE: "Venezuela", VN: "Vietnam", ZW: "Zimbabwe",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ ok: false, message: "Missing slug" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // ── Track watch view ─────────────────────────────────
    // Read existing row
    const { data: existing, error: selErr } = await supabase
      .from("watch_page_views")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (selErr) {
      console.error("watch_page_views select error:", selErr);
      return NextResponse.json({ ok: true, cached: true });
    }

    if (existing) {
      const windowStarted = new Date(existing.window_started_at || existing.last_viewed_at);
      const hoursSinceWindowStart = (Date.now() - windowStarted.getTime()) / 3_600_000;

      let views24h = existing.views_24h + 1;
      let views7d = existing.views_7d + 1;
      let windowStart = existing.window_started_at;

      if (hoursSinceWindowStart >= 24) {
        views24h = 1;
        if (hoursSinceWindowStart >= 168) views7d = 1;
        windowStart = now;
      } else if (hoursSinceWindowStart >= 168) {
        views7d = 1;
        views24h = 1;
        windowStart = now;
      }

      await supabase.from("watch_page_views").update({
        view_count: existing.view_count + 1,
        views_24h: views24h,
        views_7d: views7d,
        window_started_at: windowStart,
        last_viewed_at: now,
      }).eq("slug", slug);
    } else {
      await supabase.from("watch_page_views").insert({
        slug, view_count: 1, views_24h: 1, views_7d: 1,
        window_started_at: now, first_viewed_at: now, last_viewed_at: now,
      });
    }

    // ── Track visitor country ────────────────────────────
    const countryCode = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    if (countryCode && countryCode.length === 2) {
      try {
        const { data: existingCountry } = await supabase
          .from("visitor_countries")
          .select("*")
          .eq("country", countryCode)
          .maybeSingle();

        if (existingCountry) {
          const cwStarted = new Date(existingCountry.window_started_at || existingCountry.last_seen_at);
          const cHours = (Date.now() - cwStarted.getTime()) / 3_600_000;

          let c24h = existingCountry.views_24h + 1;
          let c7d = existingCountry.views_7d + 1;
          let cwStart = existingCountry.window_started_at;

          if (cHours >= 24) {
            c24h = 1;
            if (cHours >= 168) c7d = 1;
            cwStart = now;
          } else if (cHours >= 168) {
            c7d = 1;
            c24h = 1;
            cwStart = now;
          }

          await supabase.from("visitor_countries").update({
            visitor_count: existingCountry.visitor_count + 1,
            views_24h: c24h,
            views_7d: c7d,
            window_started_at: cwStart,
            last_seen_at: now,
          }).eq("country", countryCode);
        } else {
          await supabase.from("visitor_countries").insert({
            country: countryCode,
            visitor_count: 1,
            views_24h: 1,
            views_7d: 1,
            window_started_at: now,
            first_seen_at: now,
            last_seen_at: now,
          });
        }
      } catch (countryErr) {
        // Non-critical - country tracking failed silently
      }
    }

    // ── Track unique visitor ID ─────────────────────────
    let uid = "";
    try {
      const body = await request.json().catch(() => ({}));
      uid = (body?.uid || "").trim();
    } catch { /* ok */ }
    if (uid && /^[0-9a-f-]{32,40}$/i.test(uid)) {
      try {
        await supabase.from("visitor_ids").upsert(
          { uid, first_seen_at: now, last_seen_at: now },
          { onConflict: "uid", ignoreDuplicates: false }
        );
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, cached: true });
  }
}
