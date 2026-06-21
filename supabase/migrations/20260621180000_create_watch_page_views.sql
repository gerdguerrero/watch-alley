-- Watch page views tracking.
-- Run this in the Supabase Dashboard SQL editor.
-- Tracks which watches customers view most, displayed in the admin analytics tab.

CREATE TABLE IF NOT EXISTS watch_page_views (
  slug TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE watch_page_views ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS (used by server-side API routes)
CREATE POLICY "service_role_all" ON watch_page_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public upserts so the client-side beacon works
CREATE POLICY "public_upsert" ON watch_page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public_select" ON watch_page_views
  FOR SELECT
  TO anon, authenticated
  USING (true);
