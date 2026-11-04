-- ============================================================
-- Table-tennis tournament module (טורניר טניס שולחן יקנעם)
-- Lives in the SAME Supabase project as the triathlon, tables prefixed tt_.
-- Run once in Supabase → SQL Editor. Safe to re-run (idempotent).
-- ============================================================

-- Settings (single row, id = 1) -----------------------------------------
CREATE TABLE IF NOT EXISTS tt_settings (
  id              INT PRIMARY KEY DEFAULT 1,
  tournament_name TEXT NOT NULL DEFAULT 'טורניר טניס השולחן הגדול',
  event_date      DATE NOT NULL DEFAULT '2026-11-27',
  location        TEXT NOT NULL DEFAULT 'בית העם',
  intro_text      TEXT NOT NULL DEFAULT 'מוכנים להוכיח מי אלוף טניס השולחן? הירשמו לטורניר, קחו מחבט ובואו להתחרות על המקום הראשון! 🏆',
  status          TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration','groups','knockout','finished')),
  registration_open BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tt_settings_singleton CHECK (id = 1)
);
INSERT INTO tt_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Admin code (kept private — never read by the client, only via RPC) ------
CREATE TABLE IF NOT EXISTS tt_admin (
  id   INT PRIMARY KEY DEFAULT 1,
  code TEXT NOT NULL DEFAULT '1234',
  CONSTRAINT tt_admin_singleton CHECK (id = 1)
);
INSERT INTO tt_admin (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Categories (מין + טווח גיל) -------------------------------------------
CREATE TABLE IF NOT EXISTS tt_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  gender     TEXT NOT NULL CHECK (gender IN ('male','female','mixed')),
  min_age    INT NOT NULL DEFAULT 0,
  max_age    INT NOT NULL DEFAULT 120,
  sort       INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups / בתים ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tt_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES tt_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort        INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Participants ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tt_participants (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name    TEXT NOT NULL,
  gender       TEXT NOT NULL CHECK (gender IN ('male','female')),
  age          INT NOT NULL,
  phone        TEXT,
  has_table    BOOLEAN NOT NULL DEFAULT false,
  table_status TEXT CHECK (table_status IN ('pending','matched','collected','arrived','returned')),
  category_id  UUID REFERENCES tt_categories(id) ON DELETE SET NULL,
  group_id     UUID REFERENCES tt_groups(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','active','eliminated','champion')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Matches (group stage + knockout) --------------------------------------
CREATE TABLE IF NOT EXISTS tt_matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id  UUID REFERENCES tt_categories(id) ON DELETE CASCADE,
  stage        TEXT NOT NULL CHECK (stage IN ('group','r32','r16','quarter','semi','final','third')),
  group_id     UUID REFERENCES tt_groups(id) ON DELETE CASCADE,
  round        INT NOT NULL DEFAULT 0,
  slot         INT NOT NULL DEFAULT 0,
  player1_id   UUID REFERENCES tt_participants(id) ON DELETE SET NULL,
  player2_id   UUID REFERENCES tt_participants(id) ON DELETE SET NULL,
  score        TEXT,
  winner_id    UUID REFERENCES tt_participants(id) ON DELETE SET NULL,
  next_match_id UUID REFERENCES tt_matches(id) ON DELETE SET NULL,
  next_slot    INT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tt_participants_cat ON tt_participants(category_id);
CREATE INDEX IF NOT EXISTS idx_tt_groups_cat ON tt_groups(category_id);
CREATE INDEX IF NOT EXISTS idx_tt_matches_cat ON tt_matches(category_id);

-- RPC: verify the admin code without exposing it to the client -----------
CREATE OR REPLACE FUNCTION tt_verify_admin(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM tt_admin WHERE id = 1 AND code = p_code); $$;

-- RPC: change the admin code (requires the current code) -----------------
CREATE OR REPLACE FUNCTION tt_set_admin_code(p_old TEXT, p_new TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tt_admin WHERE id = 1 AND code = p_old) THEN
    RETURN false;
  END IF;
  UPDATE tt_admin SET code = p_new WHERE id = 1;
  RETURN true;
END; $$;

-- ---------------------------------------------------------------------
-- Row-level security.  Admin access is gated in the UI by the code, so
-- the tournament tables allow anonymous read + write (same model as the
-- triathlon's public policies).  tt_admin is NEVER world-readable.
-- ---------------------------------------------------------------------
ALTER TABLE tt_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_admin        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tt_settings','tt_categories','tt_groups','tt_participants','tt_matches']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public read %1$s" ON %1$s;', t);
    EXECUTE format('CREATE POLICY "public read %1$s" ON %1$s FOR SELECT USING (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS "public write %1$s" ON %1$s;', t);
    EXECUTE format('CREATE POLICY "public write %1$s" ON %1$s FOR ALL USING (true) WITH CHECK (true);', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %1$s TO anon, authenticated;', t);
  END LOOP;
END $$;

-- tt_admin: no policies at all → no direct access. Only the SECURITY
-- DEFINER functions above can touch it.
REVOKE ALL ON tt_admin FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION tt_verify_admin(TEXT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION tt_set_admin_code(TEXT, TEXT) TO anon, authenticated;
