import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import type { RoleCategory } from './types';
import { HEADER_KEYWORDS } from './roles';

interface ParsedRole {
  category: RoleCategory;
  title: string;
  person?: string;
  notes?: string;
  sort_order: number;
}

interface ParsedEquipment {
  category: RoleCategory;
  name: string;
  quantity?: string;
  notes?: string;
  sort_order: number;
}

interface ParsedPotential {
  name: string;
  notes?: string;
}

export interface ParsedSheet {
  sheetName: string;
  roles: ParsedRole[];
  equipment: ParsedEquipment[];
  potentialVolunteers: ParsedPotential[];
}

function cellText(v: any): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toLocaleDateString('he-IL');
  return String(v).trim();
}

function detectCategoryColumn(header: string): { category: RoleCategory; isEquipment: boolean } | null {
  for (const { keyword, category, isEquipment } of HEADER_KEYWORDS) {
    if (header.includes(keyword)) {
      return { category, isEquipment: !!isEquipment };
    }
  }
  return null;
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const result: ParsedSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Find the header row — first row that contains at least one known keyword
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i] || [];
      if (row.some(c => detectCategoryColumn(cellText(c)))) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    const header = rows[headerRowIdx];
    // For each column, detect if it's a category-start
    const columnCategories: { col: number; category: RoleCategory; isEquipment: boolean }[] = [];
    for (let c = 0; c < header.length; c++) {
      const text = cellText(header[c]);
      if (!text) continue;
      const detected = detectCategoryColumn(text);
      if (detected) columnCategories.push({ col: c, ...detected });
    }

    const roles: ParsedRole[] = [];
    const equipment: ParsedEquipment[] = [];
    const potentialVolunteers: ParsedPotential[] = [];

    for (const { col, category, isEquipment } of columnCategories) {
      const isPotential = HEADER_KEYWORDS.find(k => k.keyword === 'מתנדבים פוטנציאלים');
      const headerText = cellText(header[col]);
      const isPotentialColumn = isPotential && headerText.includes('מתנדבים פוטנציאלים');

      let sortOrder = 0;
      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const a = cellText(row[col]);
        const b = cellText(row[col + 1]);
        // Stop if more than ~10 consecutive empties
        if (!a && !b) {
          let empties = 0;
          for (let rr = r; rr < Math.min(rows.length, r + 12); rr++) {
            const rrow = rows[rr] || [];
            if (!cellText(rrow[col]) && !cellText(rrow[col + 1])) empties++;
            else break;
          }
          if (empties >= 10) break;
          continue;
        }

        if (isPotentialColumn) {
          if (a) potentialVolunteers.push({ name: a, notes: b || undefined });
        } else if (isEquipment) {
          if (a) equipment.push({ category, name: a, quantity: b || undefined, sort_order: sortOrder++ });
        } else {
          if (a) roles.push({ category, title: a, person: b || undefined, sort_order: sortOrder++ });
        }
      }
    }

    result.push({ sheetName, roles, equipment, potentialVolunteers });
  }

  return result;
}

interface ImportOptions {
  eventId: string;
  replaceExisting?: boolean;
}

interface ImportResult {
  rolesCreated: number;
  equipmentCreated: number;
  volunteersCreated: number;
  assignmentsCreated: number;
}

const EXTERNAL_TOKENS = ['נוער', 'תיכון', 'שומר', 'אמבולנס', 'בתשלום'];

function isExternalLabel(text: string): boolean {
  return EXTERNAL_TOKENS.some(t => text.includes(t));
}

export async function importParsedSheet(
  sheet: ParsedSheet,
  options: ImportOptions
): Promise<ImportResult> {
  const { eventId, replaceExisting } = options;

  if (replaceExisting) {
    await supabase.from('role_assignments').delete().in('role_id',
      (await supabase.from('roles').select('id').eq('event_id', eventId)).data?.map(r => r.id) || []
    );
    await supabase.from('roles').delete().eq('event_id', eventId);
    await supabase.from('equipment').delete().eq('event_id', eventId);
  }

  // Build volunteer map (by name)
  const existingVols = (await supabase.from('volunteers').select('id, name')).data || [];
  const volByName = new Map(existingVols.map(v => [v.name.trim(), v.id]));

  // Collect all unique people (from roles + potential list)
  const peopleToEnsure = new Set<string>();
  for (const r of sheet.roles) {
    if (r.person && !isExternalLabel(r.person)) peopleToEnsure.add(r.person.trim());
  }
  for (const p of sheet.potentialVolunteers) {
    peopleToEnsure.add(p.name.trim());
  }

  // Build status map from potential list
  const potentialNotesMap = new Map(sheet.potentialVolunteers.map(p => [p.name.trim(), p.notes || '']));

  // Create missing volunteers
  const newVolunteers: any[] = [];
  for (const name of peopleToEnsure) {
    if (volByName.has(name)) continue;
    const note = potentialNotesMap.get(name) || '';
    const status =
      /לא יכול|לא יכולה|לא בארץ/.test(note) ? 'unavailable' :
      /אם יוכל|אם תוכל|כרגע לא|לבדוק/.test(note) ? 'potential' :
      sheet.potentialVolunteers.some(p => p.name === name) ? 'potential' :
      'active';
    newVolunteers.push({ name, status, notes: note || null });
  }
  let volunteersCreated = 0;
  if (newVolunteers.length) {
    const { data } = await supabase.from('volunteers').insert(newVolunteers).select('id, name');
    for (const v of data || []) volByName.set(v.name.trim(), v.id);
    volunteersCreated = data?.length || 0;
  }

  // Insert roles
  const rolePayloads = sheet.roles.map(r => ({
    event_id: eventId,
    category: r.category,
    title: r.title,
    notes: r.notes || null,
    sort_order: r.sort_order,
  }));
  let rolesCreated = 0;
  let assignmentsCreated = 0;
  if (rolePayloads.length) {
    const { data: insertedRoles } = await supabase.from('roles').insert(rolePayloads).select('id');
    rolesCreated = insertedRoles?.length || 0;

    // Build assignments
    const assignments: any[] = [];
    (insertedRoles || []).forEach((row, i) => {
      const r = sheet.roles[i];
      if (!r.person) return;
      if (isExternalLabel(r.person)) {
        assignments.push({ role_id: row.id, external_label: r.person });
      } else {
        const vid = volByName.get(r.person.trim());
        if (vid) assignments.push({ role_id: row.id, volunteer_id: vid });
        else assignments.push({ role_id: row.id, external_label: r.person });
      }
    });
    if (assignments.length) {
      const { data } = await supabase.from('role_assignments').insert(assignments).select('id');
      assignmentsCreated = data?.length || 0;
    }
  }

  // Insert equipment
  const eqPayloads = sheet.equipment.map(e => ({
    event_id: eventId,
    category: e.category,
    name: e.name,
    quantity: e.quantity || null,
    sort_order: e.sort_order,
  }));
  let equipmentCreated = 0;
  if (eqPayloads.length) {
    const { data } = await supabase.from('equipment').insert(eqPayloads).select('id');
    equipmentCreated = data?.length || 0;
  }

  return { rolesCreated, equipmentCreated, volunteersCreated, assignmentsCreated };
}
