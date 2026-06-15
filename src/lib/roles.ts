import type { RoleCategory } from './types';

export const CATEGORIES: RoleCategory[] = ['pool', 'bike', 'run', 'catering', 'closures', 'extras', 'other'];

export const CATEGORY_LABEL: Record<RoleCategory, string> = {
  pool: '🏊 בריכה',
  bike: '🚴 אופניים',
  run: '🏃 ריצה',
  catering: '🍉 כיבוד',
  closures: '🚧 חסימות',
  extras: '🛠 משימות נוספות',
  other: '📌 אחר',
};

export const CATEGORY_COLOR: Record<RoleCategory, { bg: string; fg: string }> = {
  pool: { bg: '#dbeafe', fg: '#1d4ed8' },
  bike: { bg: '#fef3c7', fg: '#a16207' },
  run: { bg: '#dcfce7', fg: '#15803d' },
  catering: { bg: '#fee2e2', fg: '#b91c1c' },
  closures: { bg: '#ede9fe', fg: '#6d28d9' },
  extras: { bg: '#e0f2fe', fg: '#0369a1' },
  other: { bg: '#f3f4f6', fg: '#374151' },
};

// Hebrew header keywords for Excel import — map text in header row to category
export const HEADER_KEYWORDS: { keyword: string; category: RoleCategory; isEquipment?: boolean }[] = [
  { keyword: 'בריכה', category: 'pool' },
  { keyword: 'אופניים', category: 'bike' },
  { keyword: 'ריצה', category: 'run' },
  { keyword: 'כיבוד', category: 'catering', isEquipment: true },
  { keyword: 'חסימות', category: 'closures' },
  { keyword: 'משימות נוספות', category: 'extras' },
  { keyword: 'מתנדבים פוטנציאלים', category: 'other' }, // potential volunteers list
  { keyword: 'מתנדבים', category: 'extras' }, // generic extras
];
