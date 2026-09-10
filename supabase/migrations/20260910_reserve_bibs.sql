-- Reserve (spare) participant numbers.
-- Pre-printed numbers with a barcode but no participant, that an admin can
-- later assign to a late registrant. The bib_number itself is the stable
-- printed identifier, so assigning just points a participant at that number.
--
-- status: 'available' (printed, unassigned) | 'assigned' (given to a participant)
-- participant_id: the participant currently holding this number (when assigned)
-- Run this in the Supabase SQL editor against the existing database.

CREATE TABLE IF NOT EXISTS reserve_bibs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bib_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned')),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, bib_number)
);

CREATE INDEX IF NOT EXISTS idx_reserve_bibs_event ON reserve_bibs(event_id);

ALTER TABLE reserve_bibs ENABLE ROW LEVEL SECURITY;

-- Public read: registration reads reserve numbers to skip them; the reserve
-- screen reads them. Contains no personal data.
CREATE POLICY "Public read reserve_bibs" ON reserve_bibs FOR SELECT USING (true);

-- Only admins can create / assign / unassign reserve numbers.
CREATE POLICY "Admin manage reserve_bibs" ON reserve_bibs FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);
