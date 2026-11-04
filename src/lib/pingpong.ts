import { supabase } from './supabase';

// ---- Types ----------------------------------------------------------
export interface TTSettings {
  id: number;
  tournament_name: string;
  event_date: string;
  location: string;
  intro_text: string;
  status: 'registration' | 'groups' | 'knockout' | 'finished';
  registration_open: boolean;
}

export interface TTCategory {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'mixed';
  min_age: number;
  max_age: number;
  sort: number;
}

export interface TTGroup {
  id: string;
  category_id: string;
  name: string;
  sort: number;
}

export interface TTParticipant {
  id: string;
  full_name: string;
  gender: 'male' | 'female';
  age: number;
  phone?: string | null;
  has_table: boolean;
  table_status?: 'pending' | 'matched' | 'collected' | 'arrived' | 'returned' | null;
  category_id?: string | null;
  group_id?: string | null;
  status: 'registered' | 'active' | 'eliminated' | 'champion';
  created_at?: string;
}

export type TTStage = 'group' | 'r32' | 'r16' | 'quarter' | 'semi' | 'final' | 'third';

export interface TTMatch {
  id: string;
  category_id: string;
  stage: TTStage;
  group_id?: string | null;
  round: number;
  slot: number;
  player1_id?: string | null;
  player2_id?: string | null;
  score?: string | null;
  winner_id?: string | null;
  next_match_id?: string | null;
  next_slot?: number | null;
  status: 'pending' | 'done';
}

// ---- Helpers --------------------------------------------------------
export const genderHe = (g: string) => (g === 'male' ? 'גברים' : g === 'female' ? 'נשים' : 'מעורב');
export const genderHeSingle = (g: string) => (g === 'male' ? 'זכר' : 'נקבה');

export const stageHe: Record<TTStage, string> = {
  group: 'שלב הבתים',
  r32: 'שלבים מוקדמים',
  r16: 'שמינית גמר',
  quarter: 'רבע גמר',
  semi: 'חצי גמר',
  final: 'גמר',
  third: 'משחק מקום 3',
};

export async function loadSettings(): Promise<TTSettings | null> {
  const { data } = await supabase.from('tt_settings').select('*').eq('id', 1).single();
  return (data as TTSettings) || null;
}

// Verify admin code via the server-side RPC (code never leaves the DB).
export async function verifyAdmin(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('tt_verify_admin', { p_code: code });
  if (error) return false;
  return data === true;
}

const ADMIN_KEY = 'tt_admin_ok';
export const isAdmin = () => {
  try { return sessionStorage.getItem(ADMIN_KEY) === '1'; } catch { return false; }
};
export const setAdmin = (ok: boolean) => {
  try { ok ? sessionStorage.setItem(ADMIN_KEY, '1') : sessionStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ }
};

// Suggest sensible age-band categories from the actual registrants, per
// gender, trying to avoid tiny groups. Returns category drafts (not saved).
export function suggestCategories(participants: TTParticipant[]): Omit<TTCategory, 'id'>[] {
  const out: Omit<TTCategory, 'id'>[] = [];
  let sort = 0;
  for (const g of ['female', 'male'] as const) {
    const people = participants.filter(p => p.gender === g).sort((a, b) => a.age - b.age);
    if (people.length === 0) continue;
    const label = g === 'male' ? 'גברים' : 'נשים';
    // Too few for age splits → one open category.
    if (people.length < 6) {
      out.push({ name: `${label} - פתוח`, gender: g, min_age: 0, max_age: 120, sort: sort++ });
      continue;
    }
    // Candidate age bands; keep only those with >=3 people, merge small ones up.
    const bands: [number, number, string][] = [
      [0, 12, 'עד 12'],
      [13, 17, '13-17'],
      [18, 39, '18-39'],
      [40, 120, '40+'],
    ];
    const chosen: { min: number; max: number; label: string; count: number }[] = [];
    for (const [lo, hi, bl] of bands) {
      const count = people.filter(p => p.age >= lo && p.age <= hi).length;
      if (count === 0) continue;
      if (count < 3 && chosen.length > 0) {
        // merge into previous band
        const prev = chosen[chosen.length - 1];
        prev.max = hi;
        prev.label = `${prev.label.split('-')[0].replace('עד ', '').replace('+', '')}+`.includes('+')
          ? prev.label : `${prev.label}·${bl}`;
        prev.count += count;
      } else {
        chosen.push({ min: lo, max: hi, label: bl, count });
      }
    }
    // merge any remaining small leading band forward
    for (let i = 0; i < chosen.length - 1; i++) {
      if (chosen[i].count < 3) {
        chosen[i + 1].min = chosen[i].min;
        chosen[i + 1].count += chosen[i].count;
        chosen.splice(i, 1); i--;
      }
    }
    for (const c of chosen) {
      out.push({ name: `${label} ${c.label}`, gender: g, min_age: c.min, max_age: c.max, sort: sort++ });
    }
  }
  return out;
}

// Balanced split into groups of ~targetSize (default 4).
export function splitIntoGroups<T>(players: T[], targetSize = 4): T[][] {
  const n = players.length;
  if (n === 0) return [];
  const numGroups = Math.max(1, Math.round(n / targetSize));
  const groups: T[][] = Array.from({ length: numGroups }, () => []);
  // snake distribution for balance
  let dir = 1, gi = 0;
  for (const p of players) {
    groups[gi].push(p);
    if (dir === 1) { if (gi === numGroups - 1) dir = -1; else gi++; }
    else { if (gi === 0) dir = 1; else gi--; }
  }
  return groups;
}

// Round-robin pairings within a group.
export function roundRobin<T extends { id: string }>(players: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++)
      pairs.push([players[i], players[j]]);
  return pairs;
}
