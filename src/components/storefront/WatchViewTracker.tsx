"use client";

import { useEffect } from "react";

/**
 * Fires a beacon to track when a customer views a watch detail page.
 * Uses `navigator.sendBeacon` for fire-and-forget delivery (no impact on
 * page load). Deduplicates within the same session via sessionStorage.
 *
 * Sends an anonymous visitor UUID (stored in localStorage) so we can
 * count unique visitors across sessions - the same browser/browser profile
 * gets the same UUID until the user clears site data.
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

    let uid = "";
    try {
      uid = localStorage.getItem("wa_uid") || "";
      if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem("wa_uid", uid);
      }
    } catch {
      // localStorage may be restricted; proceed without uid
    }

    const url = `/api/track-watch-view/${encodeURIComponent(slug)}`;

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ uid })], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: "POST", body: JSON.stringify({ uid }), keepalive: true }).catch(() => {});
    }
  }, [slug]);

  return null;
}
