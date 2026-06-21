"use client";

import { useEffect } from "react";

/**
 * Fires a beacon to track when a customer views a watch detail page.
 * Uses `navigator.sendBeacon` for fire-and-forget delivery (no impact on
 * page load) and deduplicates within the same session via sessionStorage.
 */
export function WatchViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;

    try {
      // Deduplicate: only track once per tab session
      const key = `wv:${slug}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage may be restricted; ignore
    }

    const url = `/api/track-watch-view/${encodeURIComponent(slug)}`;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, "{}");
    } else {
      fetch(url, { method: "POST", body: "{}", keepalive: true }).catch(() => {});
    }
  }, [slug]);

  return null;
}
