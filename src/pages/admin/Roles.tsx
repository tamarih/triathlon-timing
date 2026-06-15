import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Role, RoleAssignment, RoleCategory, Volunteer } from '../../lib/types';
import { Plus, X, Pencil, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_COLOR } from '../../lib/roles';
import { parseExcelFile, importParsedSheet, type ParsedSheet } from '../../lib/excelImport';

const S = {
  page: { padding: '0 0 40px', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 900, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  card: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const },
  eventSelect: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 14, color: '#111827', background: 'white', outline: 'none', fontFamily: 'system-ui', minWidth: 200 },
  btns: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  importBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'white', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  catCard: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '18px', marginBottom: 14 },
  catHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  catTitle: { fontSize: 16, fontWeight: 800, color: '#111827' },
  catBadge: (cat: RoleCategory) => ({ fontSize: 11, background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].fg, borderRadius: 999, padding: '3px 10px', fontWeight: 700 }),
  miniAdd: { display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', color: '#1d4ed8', border: '1.5px dashed #bfdbfe', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  roleRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, marginBottom: 6, background: '#fafafa', border: '1px solid #f3f4f6', flexWrap: 'wrap' as const },
  roleTitle: { fontSize: 13, fontWeight: 700, color: '#111827', flex: '1 1 auto' as const, minWidth: 120 },
  assignSelect: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui', flex: '0 0 auto' as const, minWidth: 140 },
  externalInput: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui', minWidth: 140 },
  iconBtn: { background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' },
  iconBtnDanger: { background: 'white', border: '1.5px solid #fecaca', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' },
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 420, padding: 24, maxHeight: '92vh', overflowY: 'auto' as const },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: '#111827' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', marginBottom: 14 },
  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  importBox: { background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '16px', fontSize: 13, color: '#1d4ed8', marginBottom: 14 },
  sheetRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #dbeafe', flexWrap: 'wrap' as const },
};

interface RoleFormState {
  category: RoleCategory;
  title: string;
  notes: string;
}

const EMPTY_ROLE_FORM: RoleFormState = { category: 'pool', title: '', notes: '' };

export default function Roles() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(EMPTY_ROLE_FORM);
  const [importPreview, setImportPreview] = useState<ParsedSheet[] | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { loadEvents(); }, []);

  useEffect(() => { if (eventId) loadRolesAndAssignments(); else { setRoles([]); setAssignments([]); } }, [eventId]);

  useEffect(() => { loadVolunteers(); }, []);

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false });
    setEvents(data || []);
    if (data && data.length && !eventId) setEventId(data[0].id);
  }

  async function loadRolesAndAssignments() {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from('roles').select('*').eq('event_id', eventId).order('sort_order'),
      supabase.from('role_assignments').select('*'),
    ]);
    setRoles(r || []);
    // Filter assignments to those whose role belongs to this event
    const roleIds = new Set((r || []).map(x => x.id));
    setAssignments((a || []).filter(x => roleIds.has(x.role_id)));
  }

  async function loadVolunteers() {
    const { data } = await supabase.from('volunteers').select('*').order('name');
    setVolunteers(data || []);
  }

  const rolesByCategory = useMemo(() => {
    const map: Record<RoleCategory, Role[]> = { pool: [], bike: [], run: [], catering: [], closures: [], extras: [], other: [] };
    for (const r of roles) map[r.category].push(r);
    return map;
  }, [roles]);

  const assignmentsByRole = useMemo(() => {
    const map: Record<string, RoleAssignment[]> = {};
    for (const a of assignments) (map[a.role_id] ||= []).push(a);
    return map;
  }, [assignments]);

  function openRoleModal(cat: RoleCategory, role: Role | null) {
    setEditingRole(role);
    setRoleForm(role ? { category: role.category, title: role.title, notes: role.notes || '' } : { ...EMPTY_ROLE_FORM, category: cat });
    setShowRoleModal(true);
  }

  function closeRoleModal() {
    setShowRoleModal(false);
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE_FORM);
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    if (!roleForm.title.trim()) return;
    const payload = {
      event_id: eventId,
      category: roleForm.category,
      title: roleForm.title.trim(),
      notes: roleForm.notes.trim() || null,
      sort_order: editingRole ? editingRole.sort_order : rolesByCategory[roleForm.category].length,
    };
    if (editingRole) {
      const { error } = await supabase.from('roles').update(payload).eq('id', editingRole.id);
      if (error) return toast.error(error.message);
      toast.success('עודכן');
    } else {
      const { error } = await supabase.from('roles').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('נוסף');
    }
    closeRoleModal();
    loadRolesAndAssignments();
  }

  async function deleteRole(r: Role) {
    if (!confirm(`למחוק "${r.title}"?`)) return;
    const { error } = await supabase.from('roles').delete().eq('id', r.id);
    if (error) toast.error(error.message);
    else { toast.success('נמחק'); loadRolesAndAssignments(); }
  }

  async function setAssignment(role: Role, value: string) {
    // value can be: '' (clear), 'v:<id>' (volunteer), 'e:<label>' (external)
    const existing = assignmentsByRole[role.id]?.[0];
    if (!value) {
      if (existing) {
        await supabase.from('role_assignments').delete().eq('id', existing.id);
        loadRolesAndAssignments();
      }
      return;
    }
    let payload: any = { role_id: role.id };
    if (value.startsWith('v:')) payload.volunteer_id = value.slice(2);
    else if (value.startsWith('e:')) payload.external_label = value.slice(2);
    if (existing) {
      const update: any = { volunteer_id: payload.volunteer_id || null, external_label: payload.external_label || null };
      await supabase.from('role_assignments').update(update).eq('id', existing.id);
    } else {
      await supabase.from('role_assignments').insert(payload);
    }
    loadRolesAndAssignments();
  }

  async function setExternalLabel(role: Role, label: string) {
    const existing = assignmentsByRole[role.id]?.[0];
    const trimmed = label.trim();
    if (existing) {
      if (!trimmed) await supabase.from('role_assignments').delete().eq('id', existing.id);
      else await supabase.from('role_assignments').update({ volunteer_id: null, external_label: trimmed }).eq('id', existing.id);
    } else if (trimmed) {
      await supabase.from('role_assignments').insert({ role_id: role.id, external_label: trimmed });
    }
    loadRolesAndAssignments();
  }

  function getAssignmentValue(role: Role): string {
    const a = assignmentsByRole[role.id]?.[0];
    if (!a) return '';
    if (a.volunteer_id) return `v:${a.volunteer_id}`;
    if (a.external_label) return `e:${a.external_label}`;
    return '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const sheets = parseExcelFile(buffer);
        setImportPreview(sheets);
        if (sheets.length === 0) toast.error('לא נמצאו נתונים בקובץ');
      } catch (err: any) {
        toast.error('שגיאה בקריאת הקובץ: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  async function runImport(sheet: ParsedSheet, replaceExisting: boolean) {
    if (!eventId) return toast.error('בחרו אירוע יעד תחילה');
    setImporting(sheet.sheetName);
    try {
      const result = await importParsedSheet(sheet, { eventId, replaceExisting });
      toast.success(`יובא: ${result.rolesCreated} תפקידים, ${result.assignmentsCreated} שיוכים, ${result.equipmentCreated} פריטי ציוד, ${result.volunteersCreated} מתנדבים חדשים`);
      setImportPreview(null);
      loadRolesAndAssignments();
      loadVolunteers();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בייבוא');
    } finally {
      setImporting(null);
    }
  }

  if (events.length === 0) {
    return (
      <div style={S.page}>
        <div style={S.title}>תפקידים</div>
        <div style={S.card}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>אין אירועים. צרו אירוע ראשון במסך "אירועים".</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.title}>תפקידים</div>

      <div style={S.card}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>אירוע:</label>
            <select style={S.eventSelect} value={eventId} onChange={e => setEventId(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.date).toLocaleDateString('he-IL')})</option>)}
            </select>
          </div>
          <div style={S.btns}>
            <button style={S.importBtn} onClick={() => fileInput.current?.click()}>
              <Upload size={14} /> ייבוא Excel
            </button>
            <input ref={fileInput} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        </div>

        {importPreview && (
          <div style={S.importBox}>
            <div style={{ fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={16} /> תצוגה מקדימה — נמצאו {importPreview.length} גליונות
            </div>
            {importPreview.map(sheet => (
              <div key={sheet.sheetName} style={S.sheetRow}>
                <div style={{ flex: 1 }}>
                  <strong>גיליון "{sheet.sheetName}"</strong>: {sheet.roles.length} תפקידים · {sheet.equipment.length} פריטי ציוד · {sheet.potentialVolunteers.length} מתנדבים פוטנציאליים
                </div>
                <button style={S.addBtn} disabled={!!importing} onClick={() => runImport(sheet, false)}>
                  {importing === sheet.sheetName ? 'מייבא…' : 'ייבוא לאירוע הנוכחי'}
                </button>
                <button style={S.importBtn} disabled={!!importing} onClick={() => runImport(sheet, true)}>
                  ייבוא והחלפה
                </button>
              </div>
            ))}
            <button onClick={() => setImportPreview(null)} style={{ marginTop: 10, background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: 12, cursor: 'pointer' }}>
              ביטול
            </button>
          </div>
        )}
      </div>

      {CATEGORIES.map(cat => {
        const list = rolesByCategory[cat];
        return (
          <div key={cat} style={S.catCard}>
            <div style={S.catHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={S.catTitle}>{CATEGORY_LABEL[cat]}</span>
                <span style={S.catBadge(cat)}>{list.length}</span>
              </div>
              <button style={S.miniAdd} onClick={() => openRoleModal(cat, null)}>
                <Plus size={12} /> תפקיד
              </button>
            </div>

            {list.length === 0 && (
              <div style={{ fontSize: 12, color: '#9ca3af', padding: '6px 4px' }}>אין תפקידים בקטגוריה זו.</div>
            )}

            {list.map(role => {
              const assignedVal = getAssignmentValue(role);
              const assignment = assignmentsByRole[role.id]?.[0];
              return (
                <div key={role.id} style={S.roleRow}>
                  <div style={S.roleTitle}>{role.title}</div>
                  <select
                    style={S.assignSelect}
                    value={assignedVal.startsWith('v:') ? assignedVal : ''}
                    onChange={e => {
                      if (e.target.value) setAssignment(role, e.target.value);
                      else setAssignment(role, '');
                    }}
                  >
                    <option value="">— בחרו מתנדב —</option>
                    {volunteers.map(v => <option key={v.id} value={`v:${v.id}`}>{v.name}</option>)}
                  </select>
                  <input
                    style={S.externalInput}
                    placeholder="או: נוער / שומר"
                    defaultValue={assignment?.external_label || ''}
                    onBlur={e => {
                      const val = e.target.value;
                      if (val !== (assignment?.external_label || '')) setExternalLabel(role, val);
                    }}
                  />
                  <button style={S.iconBtn} onClick={() => openRoleModal(cat, role)} title="עריכה"><Pencil size={12} /></button>
                  <button style={S.iconBtnDanger} onClick={() => deleteRole(role)} title="מחיקה"><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        );
      })}

      {showRoleModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>{editingRole ? 'עריכת תפקיד' : 'תפקיד חדש'}</span>
              <button style={S.closeBtn} onClick={closeRoleModal}><X size={18} /></button>
            </div>
            <form onSubmit={saveRole}>
              <label style={S.label}>קטגוריה</label>
              <select style={S.input} value={roleForm.category} onChange={e => setRoleForm({ ...roleForm, category: e.target.value as RoleCategory })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>

              <label style={S.label}>שם התפקיד</label>
              <input style={S.input} value={roleForm.title} onChange={e => setRoleForm({ ...roleForm, title: e.target.value })} required autoFocus placeholder="לדוגמה: שופט 1" />

              <label style={S.label}>הערות</label>
              <input style={S.input} value={roleForm.notes} onChange={e => setRoleForm({ ...roleForm, notes: e.target.value })} placeholder="אופציונלי" />

              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={closeRoleModal}>ביטול</button>
                <button type="submit" style={S.btnPrimary}>{editingRole ? 'עדכון' : 'יצירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
