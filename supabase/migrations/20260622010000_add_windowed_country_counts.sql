-- Add time-windowed columns to visitor_countries.
-- Run in Supabase Dashboard SQL editor.

ALTER TABLE visitor_countries
  ADD COLUMN IF NOT EXISTS views_24h INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS views_7d  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS window_started_at TIMESTAMPTZ NOT NULL DEFAULT now();
