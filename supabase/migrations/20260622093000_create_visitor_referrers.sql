-- Track external referrer hostnames for watch-page visits.
-- Real first-party analytics populated by src/app/api/track-watch-view/[slug]/route.ts.

CREATE TABLE IF NOT EXISTS visitor_referrers (
  source_key TEXT PRIMARY KEY,
  source_label TEXT NOT NULL,
  visitor_count INTEGER NOT NULL DEFAULT 0,
  views_24h INTEGER NOT NULL DEFAULT 0,
  views_7d INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visitor_referrers_views_24h_idx ON visitor_referrers (views_24h DESC);
CREATE INDEX IF NOT EXISTS visitor_referrers_views_7d_idx ON visitor_referrers (views_7d DESC);
CREATE INDEX IF NOT EXISTS visitor_referrers_last_seen_at_idx ON visitor_referrers (last_seen_at DESC);
