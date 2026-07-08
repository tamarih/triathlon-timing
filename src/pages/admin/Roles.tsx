import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Role, RoleAssignment, RoleCategory, Volunteer } from '../../lib/types';
import { Plus, X, Pencil, Trash2, Wand2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_COLOR } from '../../lib/roles';

// ── styles ──────────────────────────────────────────────────────────────────
const S = {
  page: { padding: '0 0 60px', direction: 'rtl' as const, fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: 1100, margin: '0 auto' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#111827', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  btn: (variant: 'primary' | 'outline' | 'purple' | 'danger') => {
    const base: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
    if (variant === 'primary') return { ...base, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white' };
    if (variant === 'purple') return { ...base, background: '#7c3aed', color: 'white' };
    if (variant === 'danger') return { ...base, background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fecaca' };
    return { ...base, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb' };
  },
  filterBar: { background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' },
  searchWrap: { position: 'relative' as const },
  searchIcon: { position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' as const },
  searchInput: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 32px 7px 10px', fontSize: 13, outline: 'none', fontFamily: 'system-ui', width: 180 },
  catSection: { marginBottom: 20 },
  catHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  catTitle: { fontSize: 15, fontWeight: 800, color: '#111827' },
  catBadge: (cat: RoleCategory) => ({ fontSize: 11, background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].fg, borderRadius: 999, padding: '3px 10px', fontWeight: 700 }),
  tableWrap: { background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'right' as const, padding: '10px 14px', fontWeight: 700, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' as const },
  td: { padding: '10px 14px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' as const },
  addRowBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', color: '#1d4ed8', border: '1.5px dashed #bfdbfe', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', margin: '8px 0' },
  pill: (assigned: boolean) => ({ display: 'inline-block', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, background: assigned ? '#dcfce7' : '#f3f4f6', color: assigned ? '#15803d' : '#9ca3af' }),
  inlineInput: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 8px', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' as const, background: '#fafafa' },
  volunteerCell: { display: 'flex', alignItems: 'center', gap: 4 },
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440, padding: 24, maxHeight: '92vh', overflowY: 'auto' as const },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: '#111827' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  mInput: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', marginBottom: 12 },
  btnRow: { display: 'flex', gap: 10, marginTop: 6 },
  btnFull: (primary: boolean): React.CSSProperties => ({ flex: 1, background: primary ? 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' : 'white', color: primary ? 'white' : '#374151', border: primary ? 'none' : '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }),
  phone: { fontSize: 11, color: '#6b7280', fontFamily: 'monospace' },
  emptyRow: { padding: '14px', fontSize: 13, color: '#9ca3af', textAlign: 'center' as const },
};

// ── VolunteerPicker ──────────────────────────────────────────────────────────
function VolunteerPicker({
  volunteers,
  volunteerId,
  externalLabel,
  onPickVolunteer,
  onPickExternal,
}: {
  volunteers: Volunteer[];
  volunteerId?: string | null;
  externalLabel?: string | null;
  onPickVolunteer: (id: string | null) => void;
  onPickExternal: (label: string) => void;
}) {
  const [mode, setMode] = useState<'vol' | 'ext'>(externalLabel && !volunteerId ? 'ext' : 'vol');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = volunteers.find(v => v.id === volunteerId);
  const filtered = volunteers.filter(v => v.name.includes(search) || (v.phone || '').includes(search));

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (mode === 'ext') {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          style={{ ...S.inlineInput, flex: 1 }}
          placeholder="הקלד שם / תפקיד חיצוני"
          defaultValue={externalLabel || ''}
          onBlur={e => onPickExternal(e.target.value)}
        />
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 11 }} onClick={() => { setMode('vol'); onPickExternal(''); }}>↩</button>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        style={{ ...S.inlineInput, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: selected ? '#111827' : '#9ca3af' }}>{selected ? selected.name : '— בחרו מתנדב —'}</span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>▾</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 100, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginTop: 2 }}>
          <div style={{ padding: 6 }}>
            <input
              autoFocus
              style={{ ...S.inlineInput, marginBottom: 0 }}
              placeholder="חיפוש מתנדב..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            <div
              style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}
              onClick={() => { onPickVolunteer(null); setOpen(false); setSearch(''); }}
            >— ללא שיוך —</div>
            {filtered.map(v => (
              <div
                key={v.id}
                style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 13, background: v.id === volunteerId ? '#eff6ff' : 'transparent', fontWeight: v.id === volunteerId ? 700 : 400 }}
                onClick={() => { onPickVolunteer(v.id); setOpen(false); setSearch(''); }}
              >
                {v.name}{v.phone ? <span style={{ color: '#9ca3af', fontSize: 11, marginRight: 6 }}>{v.phone}</span> : null}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '8px 10px', fontSize: 12, color: '#9ca3af' }}>לא נמצא</div>}
          </div>
          <div
            style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: '#7c3aed', borderTop: '1px solid #f3f4f6', fontWeight: 600 }}
            onClick={() => { setMode('ext'); setOpen(false); onPickVolunteer(null); }}
          >+ הוסף ידנית (שם חיצוני)</div>
        </div>
      )}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────
interface BulkForm { category: RoleCategory; baseName: string; count: number; location: string; notes: string; }
interface RoleForm { category: RoleCategory; title: string; location: string; notes: string; }

const EMPTY_BULK: BulkForm = { category: 'pool', baseName: '', count: 6, location: '', notes: '' };
const EMPTY_FORM: RoleForm = { category: 'pool', title: '', location: '', notes: '' };

export default function Roles() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  // filters
  const [filterCat, setFilterCat] = useState<RoleCategory | ''>('');
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [searchText, setSearchText] = useState('');

  // modals
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>(EMPTY_BULK);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleForm>(EMPTY_FORM);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setEventId(data[0].id);
    });
    supabase.from('volunteers').select('*').order('name').then(({ data }) => setVolunteers(data || []));
  }, []);

  useEffect(() => { if (eventId) load(); }, [eventId]);

  async function load() {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from('roles').select('*').eq('event_id', eventId).order('sort_order'),
      supabase.from('role_assignments').select('*'),
    ]);
    setRoles(r || []);
    const ids = new Set((r || []).map((x: Role) => x.id));
    setAssignments((a || []).filter((x: RoleAssignment) => ids.has(x.role_id)));
  }

  const assignByRole = useMemo(() => {
    const m: Record<string, RoleAssignment> = {};
    for (const a of assignments) m[a.role_id] = a;
    return m;
  }, [assignments]);

  const rolesByCategory = useMemo(() => {
    const m: Record<RoleCategory, Role[]> = { pool: [], bike: [], run: [], catering: [], closures: [], extras: [], other: [] };
    for (const r of roles) m[r.category].push(r);
    return m;
  }, [roles]);

  // ── assignment helpers ──
  async function assignVolunteer(role: Role, volunteerId: string | null) {
    const existing = assignByRole[role.id];
    if (!volunteerId) {
      if (existing) { await supabase.from('role_assignments').delete().eq('id', existing.id); load(); }
      return;
    }
    if (existing) await supabase.from('role_assignments').update({ volunteer_id: volunteerId, external_label: null }).eq('id', existing.id);
    else await supabase.from('role_assignments').insert({ role_id: role.id, volunteer_id: volunteerId });
    load();
  }

  async function assignExternal(role: Role, label: string) {
    const existing = assignByRole[role.id];
    if (!label.trim()) {
      if (existing) { await supabase.from('role_assignments').delete().eq('id', existing.id); load(); }
      return;
    }
    if (existing) await supabase.from('role_assignments').update({ volunteer_id: null, external_label: label.trim() }).eq('id', existing.id);
    else await supabase.from('role_assignments').insert({ role_id: role.id, external_label: label.trim() });
    load();
  }

  // ── bulk create ──
  async function saveBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkForm.baseName.trim() || bulkForm.count < 1) return;
    const base = rolesByCategory[bulkForm.category].length;
    const inserts = Array.from({ length: bulkForm.count }, (_, i) => ({
      event_id: eventId,
      category: bulkForm.category,
      title: `${bulkForm.baseName.trim()} ${i + 1}`,
      location: bulkForm.location.trim() || null,
      notes: bulkForm.notes.trim() || null,
      sort_order: base + i,
    }));
    const { error } = await supabase.from('roles').insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`נוצרו ${bulkForm.count} תפקידים`);
    setShowBulk(false);
    setBulkForm(EMPTY_BULK);
    load();
  }

  // ── single role ──
  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleForm.title.trim()) return;
    const payload = {
      event_id: eventId,
      category: roleForm.category,
      title: roleForm.title.trim(),
      location: roleForm.location.trim() || null,
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
    setShowRoleModal(false);
    setEditingRole(null);
    setRoleForm(EMPTY_FORM);
    load();
  }

  async function deleteRole(r: Role) {
    if (!confirm(`למחוק "${r.title}"?`)) return;
    await supabase.from('roles').delete().eq('id', r.id);
    load();
  }

  // ── filtering ──
  function matchesFilters(role: Role): boolean {
    if (filterCat && role.category !== filterCat) return false;
    const a = assignByRole[role.id];
    if (filterAssigned === 'assigned' && !a) return false;
    if (filterAssigned === 'unassigned' && a) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      const volName = a?.volunteer_id ? (volunteers.find(v => v.id === a.volunteer_id)?.name || '') : (a?.external_label || '');
      if (!role.title.toLowerCase().includes(s) && !volName.toLowerCase().includes(s)) return false;
    }
    return true;
  }

  const visibleCats = CATEGORIES.filter(cat =>
    filterCat ? cat === filterCat : rolesByCategory[cat].some(matchesFilters)
  );

  const totalAssigned = assignments.filter(a => a.volunteer_id || a.external_label).length;

  // ── render ──
  if (events.length === 0) return (
    <div style={S.page}><div style={S.title}>תפקידים</div><div style={{ color: '#9ca3af', marginTop: 20 }}>אין אירועים. צרו אירוע תחילה.</div></div>
  );

  return (
    <div style={S.page}>
      {/* top bar */}
      <div style={S.topBar}>
        <div style={S.row}>
          <span style={S.title}>תפקידים</span>
          <select style={S.select} value={eventId} onChange={e => setEventId(e.target.value)}>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.date).toLocaleDateString('he-IL')})</option>)}
          </select>
        </div>
        <div style={S.row}>
          <button style={S.btn('purple')} onClick={() => setShowBulk(true)}><Wand2 size={14} /> יצירה אוטומטית</button>
          <button style={S.btn('primary')} onClick={() => { setEditingRole(null); setRoleForm(EMPTY_FORM); setShowRoleModal(true); }}><Plus size={14} /> תפקיד חדש</button>
        </div>
      </div>

      {/* summary */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        {roles.length} תפקידים · <span style={{ color: '#15803d', fontWeight: 600 }}>{totalAssigned} משובצים</span> · <span style={{ color: '#dc2626' }}>{roles.length - totalAssigned} פנויים</span>
      </div>

      {/* filters */}
      <div style={S.filterBar}>
        <div style={S.searchWrap}>
          <Search size={13} style={S.searchIcon} />
          <input style={S.searchInput} placeholder="חיפוש תפקיד / מתנדב" value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
        <select style={S.select} value={filterCat} onChange={e => setFilterCat(e.target.value as any)}>
          <option value="">כל הקטגוריות</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select style={S.select} value={filterAssigned} onChange={e => setFilterAssigned(e.target.value as any)}>
          <option value="all">כולם</option>
          <option value="assigned">משובצים בלבד</option>
          <option value="unassigned">פנויים בלבד</option>
        </select>
        {(filterCat || filterAssigned !== 'all' || searchText) && (
          <button style={S.btn('outline')} onClick={() => { setFilterCat(''); setFilterAssigned('all'); setSearchText(''); }}>
            <X size={12} /> נקה
          </button>
        )}
      </div>

      {/* category sections */}
      {visibleCats.map(cat => {
        const list = rolesByCategory[cat].filter(matchesFilters);
        if (list.length === 0 && filterCat !== cat) return null;
        return (
          <div key={cat} style={S.catSection}>
            <div style={S.catHeader}>
              <span style={S.catTitle}>{CATEGORY_LABEL[cat]}</span>
              <span style={S.catBadge(cat)}>{list.length}</span>
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>תפקיד</th>
                    <th style={S.th}>מיקום</th>
                    <th style={{ ...S.th, minWidth: 200 }}>מתנדב משויך</th>
                    <th style={S.th}>טלפון</th>
                    <th style={S.th}>הערות</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr><td colSpan={6} style={S.emptyRow}>אין תפקידים בקטגוריה זו</td></tr>
                  )}
                  {list.map(role => {
                    const a = assignByRole[role.id];
                    const vol = a?.volunteer_id ? volunteers.find(v => v.id === a.volunteer_id) : null;
                    const displayName = vol ? vol.name : (a?.external_label || null);
                    const phone = vol?.phone || null;
                    return (
                      <tr key={role.id}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{role.title}</div>
                          {displayName && <span style={S.pill(true)}>✓ משובץ</span>}
                          {!displayName && <span style={S.pill(false)}>פנוי</span>}
                        </td>
                        <td style={S.td}>
                          <input
                            style={{ ...S.inlineInput, width: 120 }}
                            defaultValue={role.location || ''}
                            placeholder="מיקום"
                            onBlur={async e => {
                              const val = e.target.value.trim();
                              if (val !== (role.location || '')) {
                                await supabase.from('roles').update({ location: val || null }).eq('id', role.id);
                                load();
                              }
                            }}
                          />
                        </td>
                        <td style={S.td}>
                          <VolunteerPicker
                            volunteers={volunteers}
                            volunteerId={a?.volunteer_id}
                            externalLabel={a?.external_label}
                            onPickVolunteer={id => assignVolunteer(role, id)}
                            onPickExternal={label => assignExternal(role, label)}
                          />
                        </td>
                        <td style={S.td}>
                          {phone ? <span style={S.phone}>{phone}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={S.td}>
                          <input
                            style={{ ...S.inlineInput, width: 140 }}
                            defaultValue={role.notes || ''}
                            placeholder="הערות"
                            onBlur={async e => {
                              const val = e.target.value.trim();
                              if (val !== (role.notes || '')) {
                                await supabase.from('roles').update({ notes: val || null }).eq('id', role.id);
                                load();
                              }
                            }}
                          />
                        </td>
                        <td style={{ ...S.td, whiteSpace: 'nowrap' as const }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
                              onClick={() => { setEditingRole(role); setRoleForm({ category: role.category, title: role.title, location: role.location || '', notes: role.notes || '' }); setShowRoleModal(true); }}
                              title="עריכה"
                            ><Pencil size={13} /></button>
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                              onClick={() => deleteRole(role)}
                              title="מחיקה"
                            ><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button style={S.addRowBtn} onClick={() => { setEditingRole(null); setRoleForm({ ...EMPTY_FORM, category: cat }); setShowRoleModal(true); }}>
                <Plus size={12} /> הוסף תפקיד ל{CATEGORY_LABEL[cat]}
              </button>
            </div>
          </div>
        );
      })}

      {roles.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>אין תפקידים עדיין</div>
          <div style={{ fontSize: 13 }}>לחצו על "יצירה אוטומטית" ליצירת תפקידים לפי קטגוריה</div>
        </div>
      )}

      {/* ── bulk modal ── */}
      {showBulk && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>🪄 יצירת תפקידים אוטומטית</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowBulk(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveBulk}>
              <label style={S.label}>קטגוריה</label>
              <select style={S.mInput} value={bulkForm.category} onChange={e => setBulkForm({ ...bulkForm, category: e.target.value as RoleCategory })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>

              <label style={S.label}>שם בסיס לתפקיד</label>
              <input style={S.mInput} placeholder="לדוגמה: שופט" value={bulkForm.baseName} onChange={e => setBulkForm({ ...bulkForm, baseName: e.target.value })} required autoFocus />
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: -10, marginBottom: 12 }}>
                {bulkForm.baseName && bulkForm.count > 0 ? `יצירה: ${bulkForm.baseName} 1, ${bulkForm.baseName} 2, ... ${bulkForm.baseName} ${bulkForm.count}` : ''}
              </div>

              <label style={S.label}>כמות</label>
              <input style={S.mInput} type="number" min={1} max={50} value={bulkForm.count} onChange={e => setBulkForm({ ...bulkForm, count: Number(e.target.value) })} required />

              <label style={S.label}>מיקום (אופציונלי)</label>
              <input style={S.mInput} placeholder="לדוגמה: בריכה / קו סיום" value={bulkForm.location} onChange={e => setBulkForm({ ...bulkForm, location: e.target.value })} />

              <label style={S.label}>הערות (אופציונלי)</label>
              <input style={S.mInput} placeholder="" value={bulkForm.notes} onChange={e => setBulkForm({ ...bulkForm, notes: e.target.value })} />

              <div style={S.btnRow}>
                <button type="button" style={S.btnFull(false)} onClick={() => setShowBulk(false)}>ביטול</button>
                <button type="submit" style={S.btnFull(true)}>צור {bulkForm.count} תפקידים</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── single role modal ── */}
      {showRoleModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>{editingRole ? 'עריכת תפקיד' : 'תפקיד חדש'}</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => { setShowRoleModal(false); setEditingRole(null); setRoleForm(EMPTY_FORM); }}><X size={18} /></button>
            </div>
            <form onSubmit={saveRole}>
              <label style={S.label}>קטגוריה</label>
              <select style={S.mInput} value={roleForm.category} onChange={e => setRoleForm({ ...roleForm, category: e.target.value as RoleCategory })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>

              <label style={S.label}>שם התפקיד</label>
              <input style={S.mInput} value={roleForm.title} onChange={e => setRoleForm({ ...roleForm, title: e.target.value })} placeholder="לדוגמה: שופט 1" required autoFocus />

              <label style={S.label}>מיקום</label>
              <input style={S.mInput} value={roleForm.location} onChange={e => setRoleForm({ ...roleForm, location: e.target.value })} placeholder="לדוגמה: בריכה / קו סיום" />

              <label style={S.label}>הערות</label>
              <input style={S.mInput} value={roleForm.notes} onChange={e => setRoleForm({ ...roleForm, notes: e.target.value })} placeholder="אופציונלי" />

              <div style={S.btnRow}>
                <button type="button" style={S.btnFull(false)} onClick={() => { setShowRoleModal(false); setEditingRole(null); setRoleForm(EMPTY_FORM); }}>ביטול</button>
                <button type="submit" style={S.btnFull(true)}>{editingRole ? 'עדכון' : 'יצירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
