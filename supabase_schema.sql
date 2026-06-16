-- Triathlon Community Management System - Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  rules_file_url TEXT,
  health_declaration_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','finished')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Races table
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual','relay')),
  gun_time TIME NOT NULL,
  swim_distance DECIMAL(6,2) NOT NULL DEFAULT 0,
  bike_distance DECIMAL(6,2) NOT NULL DEFAULT 0,
  run_distance DECIMAL(6,2) NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_age INT,
  max_age INT,
  max_participants INT,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table (for relay races)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  team_number TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','started','dns','dnf','dsq','finished')),
  payment_status TEXT NOT NULL DEFAULT 'exempt' CHECK (payment_status IN ('unpaid','paid','exempt')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_role TEXT CHECK (team_role IN ('swimmer','cyclist','runner')),
  bib_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  id_number TEXT,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  club TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  shirt_size TEXT CHECK (shirt_size IN ('XS','S','M','L','XL','XXL')),
  notes TEXT,
  health_declaration BOOLEAN NOT NULL DEFAULT false,
  rules_accepted BOOLEAN NOT NULL DEFAULT false,
  photo_consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','started','dns','dnf','dsq','finished')),
  payment_status TEXT NOT NULL DEFAULT 'exempt' CHECK (payment_status IN ('unpaid','paid','exempt')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timing records
CREATE TABLE timing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  station INT NOT NULL CHECK (station IN (1,2,3)),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, station),
  UNIQUE(team_id, station)
);

-- Waitlist
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  promoted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, code)
);

-- Change log
CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App users (extends auth.users)
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','volunteer','viewer')),
  name TEXT,
  assigned_station INT CHECK (assigned_station IN (1,2,3)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer roster (people)
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','potential','unavailable')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles (tasks/positions per event)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('pool','bike','run','catering','closures','extras','other')),
  title TEXT NOT NULL,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role assignments (people or external labels assigned to roles)
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
  external_label TEXT,
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pool lap logs (one row per lap)
CREATE TABLE pool_lap_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  lap_number INT NOT NULL,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pool_lap_participant ON pool_lap_logs(participant_id);

-- Equipment (supplies/quantities per event)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('pool','bike','run','catering','closures','extras','other')),
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate bib numbers
CREATE SEQUENCE bib_number_seq START 1;

-- Indexes
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_participants_race ON participants(race_id);
CREATE INDEX idx_participants_bib ON participants(bib_number);
CREATE INDEX idx_timing_participant ON timing_records(participant_id);
CREATE INDEX idx_timing_event ON timing_records(event_id);

-- RLS Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE timing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Public read for events/races
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read races" ON races FOR SELECT USING (true);
CREATE POLICY "Public read results" ON timing_records FOR SELECT USING (true);
CREATE POLICY "Public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);

-- Public insert for registration
CREATE POLICY "Public insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert waitlist" ON waitlist FOR INSERT WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admin all events" ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all races" ON races FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all participants" ON participants FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin','volunteer'))
);
CREATE POLICY "Admin all timing" ON timing_records FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin','volunteer'))
);
CREATE POLICY "Admin all coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all changelog" ON change_log FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users read own profile" ON app_users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin manage users" ON app_users FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: auto assign bib number
CREATE OR REPLACE FUNCTION assign_bib_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bib_number IS NULL THEN
    NEW.bib_number = LPAD(nextval('bib_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participants_bib BEFORE INSERT ON participants
  FOR EACH ROW EXECUTE FUNCTION assign_bib_number();
