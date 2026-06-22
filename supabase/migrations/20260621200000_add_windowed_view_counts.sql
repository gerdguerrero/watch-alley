-- Add time-windowed view counters to watch_page_views.
-- Run this in the Supabase Dashboard SQL editor.
-- Tracks views within rolling windows so admin can see recent popularity.

ALTER TABLE watch_page_views
  ADD COLUMN IF NOT EXISTS views_24h INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS views_7d  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS window_started_at TIMESTAMPTZ NOT NULL DEFAULT now();
