-- Tracks unique visitors by anonymous UUID.
-- Run in Supabase Dashboard SQL editor.
-- Used to count unique visitors for the admin analytics KPI.

CREATE TABLE IF NOT EXISTS visitor_ids (
  uid TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE visitor_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON visitor_ids
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert" ON visitor_ids
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
