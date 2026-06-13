export type UserRole = 'admin' | 'volunteer' | 'viewer';

export type EventStatus = 'draft' | 'open' | 'closed' | 'finished';

export type RaceType = 'individual' | 'relay';

export type ParticipantStatus = 'registered' | 'started' | 'dns' | 'dnf' | 'dsq' | 'finished';

export type PaymentStatus = 'unpaid' | 'paid' | 'exempt';

export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type Gender = 'male' | 'female';

export interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  location: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  rules_file_url?: string;
  health_declaration_url?: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface Race {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  type: RaceType;
  gun_time: string;
  swim_distance: number;
  bike_distance: number;
  run_distance: number;
  price: number;
  min_age?: number;
  max_age?: number;
  max_participants?: number;
  is_open: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  race_id: string;
  bib_number?: string;
  first_name: string;
  last_name: string;
  id_number?: string;
  birth_date: string;
  age?: number;
  gender: Gender;
  phone: string;
  email: string;
  city?: string;
  club?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  shirt_size?: ShirtSize;
  notes?: string;
  health_declaration: boolean;
  rules_accepted: boolean;
  photo_consent: boolean;
  status: ParticipantStatus;
  payment_status: PaymentStatus;
  team_id?: string;
  team_role?: 'swimmer' | 'cyclist' | 'runner';
  // Classification fields
  school_grade?: string;
  recommended_category?: string;
  selected_category?: string;
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
  approval_reason?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  race_id: string;
  team_number?: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: ParticipantStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface TimingRecord {
  id: string;
  event_id: string;
  participant_id?: string;
  team_id?: string;
  station: 1 | 2 | 3;
  recorded_at: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface TimingResult {
  participant_id?: string;
  team_id?: string;
  bib_number?: string;
  name: string;
  race_name: string;
  gender?: Gender;
  age?: number;
  swim_time?: number;
  bike_time?: number;
  run_time?: number;
  total_time?: number;
  status: ParticipantStatus;
  overall_rank?: number;
  gender_rank?: number;
  age_rank?: number;
  race_rank?: number;
}

export interface WaitlistEntry {
  id: string;
  event_id: string;
  race_id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  promoted: boolean;
}

export interface Coupon {
  id: string;
  event_id: string;
  code: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  max_uses?: number;
  used_count: number;
  valid_until?: string;
  is_active: boolean;
}

export interface ChangeLog {
  id: string;
  event_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  assigned_station?: 1 | 2 | 3;
}
