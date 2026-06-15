import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { Volunteer, VolunteerStatus, Role, RoleAssignment } from '../../lib/types';
import { Plus, X, Pencil, Trash2, Phone, Search, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORY_LABEL } from '../../lib/roles';

const S = {
  page: { padding: '0 0 40px', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 800, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  card: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' as const },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#111827' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', border: '1.5px solid #f3f4f6', borderRadius: 12, marginBottom: 8, background: '#fafafa', flexWrap: 'wrap' as const, cursor: 'pointer' as const },
  name: { fontSize: 14, fontWeight: 700, color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280' },
  badge: (status: VolunteerStatus) => {
    const colors: Record<VolunteerStatus, { bg: string; fg: string }> = {
      active: { bg: '#dcfce7', fg: '#15803d' },
      potential: { bg: '#fef3c7', fg: '#a16207' },
      unavailable: { bg: '#fee2e2', fg: '#b91c1c' },
    };
    return { fontSize: 11, background: colors[status].bg, color: colors[status].fg, borderRadius: 20, padding: '3px 10px', fontWeight: 600, whiteSpace: 'nowrap' as const };
  },
  iconBtn: { background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' },
  iconBtnDanger: { background: 'white', border: '1.5px solid #fecaca', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' },
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
  searchWrap: { position: 'relative' as const, flex: 1, minWidth: 200 },
  search: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 36px 8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui' },
  searchIcon: { position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
  filterChip: (active: boolean) => ({
    background: active ? '#1d4ed8' : 'white',
    color: active ? 'white' : '#6b7280',
    border: '1.5px solid ' + (active ? '#1d4ed8' : '#e5e7eb'),
    borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'system-ui',
  }),
  rolesBox: { width: '100%', marginTop: 8, padding: '8px 12px', background: 'white', borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 12, color: '#374151' },
};

const STATUS_LABEL: Record<VolunteerStatus, string> = { active: 'פעיל', potential: 'פוטנציאלי', unavailable: 'לא זמין' };
const STATUSES: VolunteerStatus[] = ['active', 'potential', 'unavailable'];

interface FormState {
  name: string;
  phone: string;
  status: VolunteerStatus;
  notes: string;
}

const EMPTY_FORM: FormState = { name: '', phone: '', status: 'active', notes: '' };

type Filter = 'all' | VolunteerStatus;

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [{ data: v }, { data: r }, { data: a }] = await Promise.all([
      supabase.from('volunteers').select('*').order('name'),
      supabase.from('roles').select('*'),
      supabase.from('role_assignments').select('*'),
    ]);
    setVolunteers(v || []);
    setRoles(r || []);
    setAssignments(a || []);
  }

  const rolesByVolunteer = useMemo(() => {
    const map: Record<string, Role[]> = {};
    const roleById = Object.fromEntries(roles.map(r => [r.id, r]));
    for (const a of assignments) {
      if (a.volunteer_id && roleById[a.role_id]) {
        (map[a.volunteer_id] ||= []).push(roleById[a.role_id]);
      }
    }
    return map;
  }, [roles, assignments]);

  const filtered = useMemo(() => {
    let list = volunteers;
    if (filter !== 'all') list = list.filter(v => v.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.phone || '').includes(q) ||
        (v.notes || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [volunteers, filter, search]);

  const counts = useMemo(() => ({
    all: volunteers.length,
    active: volunteers.filter(v => v.status === 'active').length,
    potential: volunteers.filter(v => v.status === 'potential').length,
    unavailable: volunteers.filter(v => v.status === 'unavailable').length,
  }), [volunteers]);

  function openModal(v: Volunteer | null) {
    setEditing(v);
    setForm(v ? { name: v.name, phone: v.phone || '', status: v.status, notes: v.notes || '' } : EMPTY_FORM);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from('volunteers').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('המתנדב עודכן');
      } else {
        const { error } = await supabase.from('volunteers').insert(payload);
        if (error) throw error;
        toast.success('המתנדב נוסף');
      }
      closeModal();
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function remove(v: Volunteer) {
    if (!confirm(`למחוק את ${v.name}?`)) return;
    const { error } = await supabase.from('volunteers').delete().eq('id', v.id);
    if (error) toast.error(error.message);
    else { toast.success('המתנדב נמחק'); loadAll(); }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={S.page}>
      <div style={S.title}>מתנדבים</div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>רשימת מתנדבים ({volunteers.length})</span>
          <button style={S.addBtn} onClick={() => openModal(null)}>
            <Plus size={14} /> מתנדב חדש
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={S.searchWrap}>
            <input style={S.search} placeholder="חיפוש לפי שם / טלפון / הערה" value={search} onChange={e => setSearch(e.target.value)} />
            <Search size={16} style={S.searchIcon} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button style={S.filterChip(filter === 'all')} onClick={() => setFilter('all')}>הכל ({counts.all})</button>
          <button style={S.filterChip(filter === 'active')} onClick={() => setFilter('active')}>פעילים ({counts.active})</button>
          <button style={S.filterChip(filter === 'potential')} onClick={() => setFilter('potential')}>פוטנציאליים ({counts.potential})</button>
          <button style={S.filterChip(filter === 'unavailable')} onClick={() => setFilter('unavailable')}>לא זמינים ({counts.unavailable})</button>
        </div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: '#6b7280', padding: '20px 4px', textAlign: 'center' }}>
            {volunteers.length === 0 ? 'אין מתנדבים. הוסיפו את המתנדב הראשון או ייבאו מאקסל בדף תפקידים.' : 'לא נמצאו תוצאות.'}
          </div>
        )}

        {filtered.map(v => {
          const vRoles = rolesByVolunteer[v.id] || [];
          const isExpanded = expanded.has(v.id);
          return (
            <div key={v.id} style={{ ...S.row, flexDirection: 'column' as const, alignItems: 'stretch' as const }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} onClick={() => vRoles.length > 0 && toggleExpand(v.id)}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={S.name}>{v.name}</div>
                  <div style={S.sub}>
                    {v.phone && <span><Phone size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginLeft: 3 }} />{v.phone}</span>}
                    {v.phone && v.notes && ' · '}
                    {v.notes}
                  </div>
                </div>
                {vRoles.length > 0 && (
                  <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                    {vRoles.length} {vRoles.length === 1 ? 'תפקיד' : 'תפקידים'}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                )}
                <span style={S.badge(v.status)}>{STATUS_LABEL[v.status]}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); openModal(v); }} title="עריכה" style={S.iconBtn}>
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); remove(v); }} title="מחיקה" style={S.iconBtnDanger}>
                  <Trash2 size={14} />
                </button>
              </div>
              {isExpanded && vRoles.length > 0 && (
                <div style={S.rolesBox}>
                  {vRoles.map(r => (
                    <div key={r.id} style={{ padding: '4px 0' }}>
                      <span style={{ color: '#6b7280', marginLeft: 6 }}>{CATEGORY_LABEL[r.category]}</span>
                      <strong>{r.title}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>{editing ? 'עריכת מתנדב' : 'מתנדב חדש'}</span>
              <button style={S.closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <label style={S.label}>שם מלא</label>
              <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus placeholder="לדוגמה: ראובן כהן" />

              <label style={S.label}>טלפון</label>
              <input style={S.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="050-1234567" type="tel" />

              <label style={S.label}>סטטוס</label>
              <select style={S.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as VolunteerStatus })}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>

              <label style={S.label}>הערות</label>
              <input style={S.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="לדוגמה: יביא חזיית זוהר" />

              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={closeModal}>ביטול</button>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : editing ? 'עדכון' : 'יצירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
