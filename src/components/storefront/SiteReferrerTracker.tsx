"use client";

import { useEffect } from "react";

const KNOWN_SOURCE_PARAMS = ["utm_source", "source", "ref", "referrer"];

function getExplicitSource(searchParams: URLSearchParams) {
  for (const key of KNOWN_SOURCE_PARAMS) {
    const value = searchParams.get(key);
    if (value && value.trim()) return value.trim();
  }

  // Instagram/Facebook sometimes append platform-specific click IDs instead of
  // preserving a useful document.referrer. Treat these as real platform signals.
  if (searchParams.has("igshid") || searchParams.has("igsh")) return "instagram";
  if (searchParams.has("fbclid")) return "facebook";

  return "";
}

/**
 * Tracks the external source that landed a visitor anywhere on the App Router
 * storefront. This complements WatchViewTracker, which only fires on watch
 * detail pages.
 */
export function SiteReferrerTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = getExplicitSource(params);
    const referrer = document.referrer || "";

    if (!source && !referrer) return;

    try {
      const sessionKey = `wa-ref:${source || referrer}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // sessionStorage may be unavailable; still send the beacon.
    }

    const payload = JSON.stringify({ source, referrer });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track-referrer", blob);
    } else {
      fetch("/api/track-referrer", {
        method: "POST",
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  return null;
}
