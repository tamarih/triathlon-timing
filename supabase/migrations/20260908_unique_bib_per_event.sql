-- Prevent duplicate bib numbers within the same event. Combined with the
-- retry logic in the registration form, this guarantees two simultaneous
-- sign-ups can never receive the same number.
--
-- If this fails with a "could not create unique index" error, there are
-- existing duplicate bib numbers to resolve first — find them with:
--   SELECT event_id, bib_number, COUNT(*) FROM participants
--   WHERE bib_number IS NOT NULL
--   GROUP BY event_id, bib_number HAVING COUNT(*) > 1;
-- Run this in the Supabase SQL editor against the existing database.

CREATE UNIQUE INDEX IF NOT EXISTS participants_event_bib_uniq
  ON participants (event_id, bib_number)
  WHERE bib_number IS NOT NULL;
