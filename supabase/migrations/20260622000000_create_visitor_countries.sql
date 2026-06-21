-- Tracks which countries visitors come from.
-- Run this in the Supabase Dashboard SQL editor.
-- Populated by the watch view tracking API using Vercel's x-vercel-ip-country header.

CREATE TABLE IF NOT EXISTS visitor_countries (
  country TEXT PRIMARY KEY,
  visitor_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE visitor_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON visitor_countries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_select" ON visitor_countries
  FOR SELECT
  TO anon, authenticated
  USING (true);
