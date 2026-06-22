import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SITE_HOSTS = new Set(["thewatchalley.com", "www.thewatchalley.com"]);

const SOURCE_ALIASES: Record<string, { key: string; label: string }> = {
  ig: { key: "instagram.com", label: "Instagram" },
  instagram: { key: "instagram.com", label: "Instagram" },
  "instagram.com": { key: "instagram.com", label: "Instagram" },
  "l.instagram.com": { key: "instagram.com", label: "Instagram" },
  fb: { key: "facebook.com", label: "Facebook" },
  facebook: { key: "facebook.com", label: "Facebook" },
  "facebook.com": { key: "facebook.com", label: "Facebook" },
  "l.facebook.com": { key: "facebook.com", label: "Facebook" },
  meta: { key: "facebook.com", label: "Meta" },
  google: { key: "google.com", label: "Google" },
  "google.com": { key: "google.com", label: "Google" },
  tiktok: { key: "tiktok.com", label: "TikTok" },
  "tiktok.com": { key: "tiktok.com", label: "TikTok" },
  youtube: { key: "youtube.com", label: "YouTube" },
  "youtube.com": { key: "youtube.com", label: "YouTube" },
};

function labelFromHost(host: string) {
  return host
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeSourceValue(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  const raw = value.trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();

  const alias = SOURCE_ALIASES[lowered.replace(/^www\./, "")];
  if (alias) return alias;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || SITE_HOSTS.has(host) || SITE_HOSTS.has(url.hostname.toLowerCase())) return null;
    const hostAlias = SOURCE_ALIASES[host];
    if (hostAlias) return hostAlias;
    return { key: host, label: labelFromHost(host) };
  } catch {
    // Continue below; UTM values are often plain strings like "instagram".
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(lowered)) {
    const host = lowered.replace(/^www\./, "");
    if (SITE_HOSTS.has(host)) return null;
    return { key: host, label: labelFromHost(host) };
  }

  // Keep non-domain UTM sources usable, but sanitize into a stable key.
  const key = lowered.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!key) return null;
  return {
    key,
    label: raw.slice(0, 80).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

async function incrementReferrer(source: { key: string; label: string }) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existingReferrer } = await supabase
    .from("visitor_referrers")
    .select("*")
    .eq("source_key", source.key)
    .maybeSingle();

  if (existingReferrer) {
    const refStarted = new Date(existingReferrer.window_started_at || existingReferrer.last_seen_at);
    const refHours = (Date.now() - refStarted.getTime()) / 3_600_000;

    let ref24h = existingReferrer.views_24h + 1;
    let ref7d = existingReferrer.views_7d + 1;
    let refWindowStart = existingReferrer.window_started_at;

    if (refHours >= 24) {
      ref24h = 1;
      if (refHours >= 168) ref7d = 1;
      refWindowStart = now;
    } else if (refHours >= 168) {
      ref7d = 1;
      ref24h = 1;
      refWindowStart = now;
    }

    await supabase.from("visitor_referrers").update({
      source_label: source.label,
      visitor_count: existingReferrer.visitor_count + 1,
      views_24h: ref24h,
      views_7d: ref7d,
      window_started_at: refWindowStart,
      last_seen_at: now,
    }).eq("source_key", source.key);
    return;
  }

  await supabase.from("visitor_referrers").insert({
    source_key: source.key,
    source_label: source.label,
    visitor_count: 1,
    views_24h: 1,
    views_7d: 1,
    window_started_at: now,
    first_seen_at: now,
    last_seen_at: now,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = normalizeSourceValue(body?.source) || normalizeSourceValue(body?.referrer);

    if (!source) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    await incrementReferrer(source);
    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    console.error("track-referrer error:", err);
    // Analytics must never break customer browsing.
    return NextResponse.json({ ok: true, tracked: false });
  }
}
