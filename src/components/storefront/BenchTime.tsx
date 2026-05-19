"use client";

import { useEffect, useState } from "react";

/**
 * Live Manila-time stamp for the footer. Refreshes every 60s. Reads as
 * "operator detail" — premium watch site move ("we know what time it
 * actually is, here, on the bench").
 *
 * SSR renders an empty span, fills in after hydration so we don't ship
 * a stale baked-in timestamp.
 */
export function BenchTime() {
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setStamp(`Bench time · ${fmt.format(now)} PHT`);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
      {stamp}
    </span>
  );
}
