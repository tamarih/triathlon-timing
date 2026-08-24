-- Add races.started_at — the real gun time of each race, set once when the
-- race is started. Used to (a) prevent re-starting a race, (b) run a live
-- background timer, and (c) compute accurate swim/total times in results
-- (a full timestamp compared against the timing records' timestamps).
-- Run this in the Supabase SQL editor against the existing database.

ALTER TABLE races ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
