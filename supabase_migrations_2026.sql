-- ============================================================
-- Supabase changes applied during the 2026 season
-- (run these AFTER supabase_schema.sql to reach the current state)
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- 1) Allow a relay member to hold more than one role (e.g. "swimmer+cyclist").
--    Removes the single-value CHECK on participants.team_role.
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_team_role_check;

-- 2) Event-day check-in (arrived) flag.
ALTER TABLE participants ADD COLUMN IF NOT EXISTS checked_in boolean NOT NULL DEFAULT false;

-- 3) Let the registration desk user (role 'registration') update participants
--    (check-in, edits) in addition to admin/volunteer.
DROP POLICY IF EXISTS "Registration update participants" ON participants;
CREATE POLICY "Registration update participants" ON participants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin','volunteer','registration'))
);

-- 4) Reserve numbers: grant table privileges and let staff create/manage them
--    from the app (the "ברקודים" button and the "מספרי רזרבה" screen).
GRANT SELECT, INSERT, UPDATE, DELETE ON reserve_bibs TO authenticated;
DROP POLICY IF EXISTS "Reserve manage by staff" ON reserve_bibs;
CREATE POLICY "Reserve manage by staff" ON reserve_bibs FOR ALL
USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin','volunteer','registration')))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin','volunteer','registration')));
