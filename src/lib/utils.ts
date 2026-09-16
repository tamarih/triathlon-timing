import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const USERNAME_DOMAIN = 'triathlon.local';

export function toLoginEmail(input: string): string {
  const v = input.trim();
  if (v.includes('@')) return v;
  return `${v.toLowerCase().replace(/\s+/g, '')}@${USERNAME_DOMAIN}`;
}

export function isUsernameEmail(email: string | undefined | null): boolean {
  return !!email && email.endsWith(`@${USERNAME_DOMAIN}`);
}

export function displayLogin(email: string | undefined | null): string {
  if (!email) return '';
  return isUsernameEmail(email) ? email.split('@')[0] : email;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '--:--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL');
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('he-IL');
}

export function timeDiffSeconds(t1: string, t2: string): number {
  const d1 = new Date(t1).getTime();
  const d2 = new Date(t2).getTime();
  return Math.floor(Math.abs(d2 - d1) / 1000);
}

export function genderLabel(gender: string): string {
  return gender === 'male' ? 'זכר' : 'נקבה';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    registered: 'רשום',
    started: 'זינק',
    dns: 'DNS',
    dnf: 'DNF',
    dsq: 'DSQ',
    finished: 'סיים',
  };
  return map[status] || status;
}

export function paymentLabel(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'לא שולם',
    paid: 'שולם',
    exempt: 'פטור',
  };
  return map[status] || status;
}

export function raceTypeLabel(type: string): string {
  return type === 'relay' ? 'שליחים' : 'אישי';
}

// Pool lengths ("בריכות") per swim distance in meters (fallback only).
const SWIM_LAPS: Record<number, number> = { 75: 3, 125: 5, 375: 15, 525: 21 };

// Authoritative distances per race category (swim meters, pool lengths, bike km, run meters).
type RaceDist = { swimM: number; laps: number; bikeKm: number; runM: number };
const RACE_DIST: { match: RegExp; d: RaceDist }[] = [
  { match: /ספרינטון/, d: { swimM: 525, laps: 21, bikeKm: 10, runM: 4000 } },
  { match: /נוער/,     d: { swimM: 125, laps: 5,  bikeKm: 4,  runM: 1200 } },
  { match: /ילדים/,    d: { swimM: 75,  laps: 3,  bikeKm: 3,  runM: 600 } },
  { match: /שלשות|שליחים/, d: { swimM: 375, laps: 15, bikeKm: 10, runM: 2000 } },
  { match: /קלאסי/,    d: { swimM: 375, laps: 15, bikeKm: 10, runM: 2000 } },
];

function raceDistFor(name: string): RaceDist | undefined {
  return RACE_DIST.find(x => x.match.test(name))?.d;
}

function formatRun(runM: number): string {
  if (runM >= 1000) {
    const km = runM / 1000;
    return `${Number.isInteger(km) ? km : km.toFixed(1)} ק"מ`;
  }
  return `${runM} מ'`;
}

// Human-readable distances line for a race: swim (with pool lengths), bike, run.
export function raceDistanceLine(race: { name?: string; swim_distance?: number; bike_distance?: number; run_distance?: number } | undefined): string {
  if (!race) return '';
  const name = race.name || '';
  const d = raceDistFor(name);
  if (d) {
    return `שחייה ${d.swimM} מ' (${d.laps} בריכות) · אופניים ${d.bikeKm} ק"מ · ריצה ${formatRun(d.runM)}`;
  }
  // Fallback to stored values if the race name is unrecognized.
  const swim = race.swim_distance || 0;
  const laps = SWIM_LAPS[swim];
  return `שחייה ${swim} מ'${laps ? ` (${laps} בריכות)` : ''} · אופניים ${race.bike_distance ?? 0} ק"מ · ריצה ${race.run_distance ?? 0} ק"מ`;
}

// Meeting/assembly info line. Youth and kids assemble at 15:30, others at 14:30.
export function raceMeetingInfo(race: { name?: string } | undefined): string {
  const name = race?.name || '';
  const time = /נוער|ילדים/.test(name) ? '15:30' : '14:30';
  return `מפגש: 18 בספטמבר, בשעה ${time}, בבריכת המושבה יקנעם.`;
}

// Relay (שלשות) helpers. team_role may hold more than one role, joined by "+"
// (e.g. "swimmer+cyclist" when one person does two legs).
export function roleSet(team_role?: string): string[] {
  return (team_role || '').split('+').map(s => s.trim()).filter(Boolean);
}
export function hasRole(team_role: string | undefined, role: string): boolean {
  return roleSet(team_role).includes(role);
}

const ROLE_HE: Record<string, string> = { swimmer: 'שחיין', cyclist: 'רוכב', runner: 'רץ' };
const ROLE_EMOJI: Record<string, string> = { swimmer: '🏊 שחיין', cyclist: '🚴 רוכב', runner: '🏃 רץ' };

export function relayRoleLabel(team_role?: string): string {
  return roleSet(team_role).map(r => ROLE_HE[r]).filter(Boolean).join(' + ');
}
export function relayRoleEmojis(team_role?: string): string {
  return roleSet(team_role).map(r => ROLE_EMOJI[r]).filter(Boolean).join(' · ');
}

// The leg(s) a relay member does, with distances.
export function relayLegLine(team_role?: string): string {
  const d = raceDistFor('שלשות');
  if (!d) return '';
  return roleSet(team_role).map(r =>
    r === 'swimmer' ? `שחייה ${d.swimM} מ' (${d.laps} בריכות)`
    : r === 'cyclist' ? `אופניים ${d.bikeKm} ק"מ`
    : r === 'runner' ? `ריצה ${formatRun(d.runM)}`
    : ''
  ).filter(Boolean).join(' · ');
}

export function shirtSizeLabel(size: string): string {
  return size || '';
}

export function countdownString(dateStr: string, timeStr: string): string {
  const eventDate = new Date(`${dateStr}T${timeStr}`);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  if (diff <= 0) return 'האירוע התחיל';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days} ימים, ${hours} שעות`;
  if (hours > 0) return `${hours} שעות, ${minutes} דקות`;
  return `${minutes} דקות`;
}
