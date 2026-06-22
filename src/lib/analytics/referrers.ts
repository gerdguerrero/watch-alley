import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SITE_HOSTS = new Set(["thewatchalley.com", "www.thewatchalley.com"]);

const APP_SOURCE_ALIASES: Record<string, { key: string; label: string }> = {
  ig: { key: "instagram", label: "Instagram" },
  instagram: { key: "instagram", label: "Instagram" },
  fb: { key: "facebook", label: "Facebook" },
  facebook: { key: "facebook", label: "Facebook" },
  meta: { key: "meta", label: "Meta" },
  tiktok: { key: "tiktok", label: "TikTok" },
  google: { key: "google", label: "Google" },
  youtube: { key: "youtube", label: "YouTube" },
};

function normalizeHost(hostname: string) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function labelFromHost(host: string) {
  return host;
}

function labelFromSource(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeReferrerSource(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  const raw = value.trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const exactHost = url.hostname.trim().toLowerCase();
    const normalizedHost = normalizeHost(exactHost);
    if (!exactHost || SITE_HOSTS.has(exactHost) || SITE_HOSTS.has(normalizedHost)) return null;

    // Vercel-style referrers are grouped by the actual hostname/app source, so
    // keep l.instagram.com, lm.facebook.com, m.facebook.com, etc. distinct.
    return { key: exactHost, label: labelFromHost(exactHost) };
  } catch {
    // UTM/source values are commonly plain strings, not URLs.
  }

  const plainHost = lowered
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/^www\./, "");
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(plainHost)) {
    if (SITE_HOSTS.has(plainHost)) return null;
    return { key: plainHost, label: labelFromHost(plainHost) };
  }

  const alias = APP_SOURCE_ALIASES[lowered.replace(/^www\./, "")];
  if (alias) return alias;

  const key = lowered
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!key) return null;
  return { key, label: labelFromSource(raw.slice(0, 80)) };
}

export function normalizeVisitorUid(value: unknown) {
  if (typeof value !== "string") return null;
  const uid = value.trim();
  return /^[0-9a-f-]{32,40}$/i.test(uid) ? uid : null;
}

export async function recordReferrerVisit(input: {
  source: { key: string; label: string };
  uid?: string | null;
  path?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const pagePath = typeof input.path === "string" ? input.path.slice(0, 512) : null;
  const uid = normalizeVisitorUid(input.uid);

  await supabase.from("visitor_referrer_events").insert({
    source_key: input.source.key,
    source_label: input.source.label,
    uid,
    page_path: pagePath,
    created_at: now,
  });

  if (uid) {
    await supabase.from("visitor_referrer_visitors").upsert(
      {
        source_key: input.source.key,
        uid,
        source_label: input.source.label,
        first_seen_at: now,
        last_seen_at: now,
      },
      { onConflict: "source_key,uid", ignoreDuplicates: false }
    );
  }
}
