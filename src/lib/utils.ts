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
