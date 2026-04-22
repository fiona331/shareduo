-- Migration: add view counter columns to shares
--
-- Apply by running:
--   psql $DATABASE_URL -f web/drizzle/0001_add_view_counter.sql
-- Or paste into the Neon SQL editor.
--
-- Safe to re-run: both statements use IF NOT EXISTS.

ALTER TABLE "shares"
  ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0 NOT NULL;

ALTER TABLE "shares"
  ADD COLUMN IF NOT EXISTS "last_viewed_at" timestamp;
