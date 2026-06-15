import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { Volunteer, RouteStation, Discipline, VolunteerAssignmentType } from '../../lib/types';
import { Plus, X, Pencil, Trash2, Phone, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  page: { padding: '0 0 40px', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 800, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  card: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' as const },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#111827' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', border: '1.5px solid #f3f4f6', borderRadius: 12, marginBottom: 8, background: '#fafafa', flexWrap: 'wrap' as const },
  name: { fontSize: 14, fontWeight: 700, color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280' },
  badge: { fontSize: 12, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' as const },
  badgeRoute: { fontSize: 12, background: '#fef3c7', color: '#a16207', borderRadius: 20, padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' as const },
  badgeJudge: { fontSize: 12, background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' as const },
  badgeNone: { fontSize: 12, background: '#f3f4f6', color: '#6b7280', borderRadius: 20, padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' as const },
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
  typeRow: { display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 14 },
  typeBtn: (active: boolean) => ({
    flex: 1,
    minWidth: 80,
    background: active ? '#1d4ed8' : 'white',
    color: active ? 'white' : '#374151',
    border: '1.5px solid ' + (active ? '#1d4ed8' : '#e5e7eb'),
    borderRadius: 10, padding: '10px 8px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'system-ui',
  }),
  discBtn: (active: boolean) => ({
    background: active ? '#1d4ed8' : 'white',
    color: active ? 'white' : '#374151',
    border: '1.5px solid ' + (active ? '#1d4ed8' : '#e5e7eb'),
    borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'system-ui',
  }),
  filterChip: (active: boolean) => ({
    background: active ? '#1d4ed8' : 'white',
    color: active ? 'white' : '#6b7280',
    border: '1.5px solid ' + (active ? '#1d4ed8' : '#e5e7eb'),
    borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'system-ui',
  }),
};

const disciplineLabel: Record<Discipline, string> = { swim: '🏊 שחייה', bike: '🚴 אופניים', run: '🏃 ריצה' };
const DISCIPLINES: Discipline[] = ['swim', 'bike', 'run'];
const TIMING_LABEL: Record<number, string> = { 1: 'תחנה 1 — יציאה משחייה', 2: 'תחנה 2 — סיום אופניים', 3: 'תחנה 3 — קו סיום' };

type FilterType = 'all' | 'unassigned' | 'timing' | 'route' | 'judge';

interface FormState {
  name: string;
  phone: string;
  notes: string;
  assignment_type: VolunteerAssignmentType;
  assigned_station: string;
  assigned_route_station: string;
  judge_disciplines: Discipline[];
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', notes: '',
  assignment_type: null, assigned_station: '', assigned_route_station: '', judge_disciplines: [],
};

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadVolunteers();
    loadStations();
  }, []);

  async function loadVolunteers() {
    const { data } = await supabase.from('volunteers').select('*').order('name');
    setVolunteers(data || []);
  }

  async function loadStations() {
    const { data } = await supabase.from('route_stations').select('*').eq('is_active', true).order('sort_order').order('name');
    setStations(data || []);
  }

  const stationName = (id?: string) => stations.find(s => s.id === id)?.name || 'תחנה';

  const filtered = useMemo(() => {
    let list = volunteers;
    if (filter === 'unassigned') list = list.filter(v => !v.assignment_type);
    else if (filter !== 'all') list = list.filter(v => v.assignment_type === filter);
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
    unassigned: volunteers.filter(v => !v.assignment_type).length,
    timing: volunteers.filter(v => v.assignment_type === 'timing').length,
    route: volunteers.filter(v => v.assignment_type === 'route').length,
    judge: volunteers.filter(v => v.assignment_type === 'judge').length,
  }), [volunteers]);

  function openModal(v: Volunteer | null) {
    setEditing(v);
    if (v) {
      setForm({
        name: v.name,
        phone: v.phone || '',
        notes: v.notes || '',
        assignment_type: v.assignment_type,
        assigned_station: v.assigned_station ? String(v.assigned_station) : '',
        assigned_route_station: v.assigned_route_station || '',
        judge_disciplines: v.judge_disciplines || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
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
        notes: form.notes.trim() || null,
        assignment_type: form.assignment_type,
        assigned_station: form.assignment_type === 'timing' && form.assigned_station ? Number(form.assigned_station) : null,
        assigned_route_station: form.assignment_type === 'route' && form.assigned_route_station ? form.assigned_route_station : null,
        judge_disciplines: form.assignment_type === 'judge' && form.judge_disciplines.length ? form.judge_disciplines : null,
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
      loadVolunteers();
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
    else { toast.success('המתנדב נמחק'); loadVolunteers(); }
  }

  function renderBadge(v: Volunteer) {
    if (v.assignment_type === 'timing' && v.assigned_station) {
      return <span style={S.badge}>⏱️ תחנה {v.assigned_station}</span>;
    }
    if (v.assignment_type === 'route' && v.assigned_route_station) {
      return <span style={S.badgeRoute}>📍 {stationName(v.assigned_route_station)}</span>;
    }
    if (v.assignment_type === 'judge' && v.judge_disciplines?.length) {
      return <span style={S.badgeJudge}>⚖️ {v.judge_disciplines.map(d => disciplineLabel[d].split(' ')[1]).join(' / ')}</span>;
    }
    return <span style={S.badgeNone}>ללא שיוך</span>;
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
          <button style={S.filterChip(filter === 'unassigned')} onClick={() => setFilter('unassigned')}>ללא שיוך ({counts.unassigned})</button>
          <button style={S.filterChip(filter === 'timing')} onClick={() => setFilter('timing')}>⏱️ תיזמון ({counts.timing})</button>
          <button style={S.filterChip(filter === 'route')} onClick={() => setFilter('route')}>📍 מסלול ({counts.route})</button>
          <button style={S.filterChip(filter === 'judge')} onClick={() => setFilter('judge')}>⚖️ שופטים ({counts.judge})</button>
        </div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: '#6b7280', padding: '20px 4px', textAlign: 'center' }}>
            {volunteers.length === 0 ? 'אין מתנדבים. הוסיפו את המתנדב הראשון.' : 'לא נמצאו תוצאות.'}
          </div>
        )}

        {filtered.map(v => (
          <div key={v.id} style={S.row}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={S.name}>{v.name}</div>
              <div style={S.sub}>
                {v.phone && <span><Phone size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginLeft: 3 }} />{v.phone}</span>}
                {v.phone && v.notes && ' · '}
                {v.notes}
              </div>
            </div>
            {renderBadge(v)}
            <button type="button" onClick={() => openModal(v)} title="עריכה" style={S.iconBtn}>
              <Pencil size={14} />
            </button>
            <button type="button" onClick={() => remove(v)} title="מחיקה" style={S.iconBtnDanger}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
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

              <label style={S.label}>הערות (אופציונלי)</label>
              <input style={S.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="לדוגמה: יביא חזיית זוהר" />

              <label style={S.label}>שיוך</label>
              <div style={S.typeRow}>
                <button type="button" style={S.typeBtn(form.assignment_type === null)} onClick={() => setForm({ ...form, assignment_type: null })}>ללא</button>
                <button type="button" style={S.typeBtn(form.assignment_type === 'timing')} onClick={() => setForm({ ...form, assignment_type: 'timing' })}>⏱️ תיזמון</button>
                <button type="button" style={S.typeBtn(form.assignment_type === 'route')} onClick={() => setForm({ ...form, assignment_type: 'route' })}>📍 מסלול</button>
                <button type="button" style={S.typeBtn(form.assignment_type === 'judge')} onClick={() => setForm({ ...form, assignment_type: 'judge' })}>⚖️ שופט</button>
              </div>

              {form.assignment_type === 'timing' && (
                <>
                  <label style={S.label}>תחנת תיזמון</label>
                  <select style={S.input} value={form.assigned_station} onChange={e => setForm({ ...form, assigned_station: e.target.value })} required>
                    <option value="">בחרו תחנה</option>
                    <option value="1">{TIMING_LABEL[1]}</option>
                    <option value="2">{TIMING_LABEL[2]}</option>
                    <option value="3">{TIMING_LABEL[3]}</option>
                  </select>
                </>
              )}

              {form.assignment_type === 'route' && (
                <>
                  <label style={S.label}>תחנת מסלול</label>
                  {stations.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 14 }}>אין תחנות מסלול. צרו תחנה בהגדרות → תחנות מסלול.</div>
                  ) : (
                    <select style={S.input} value={form.assigned_route_station} onChange={e => setForm({ ...form, assigned_route_station: e.target.value })} required>
                      <option value="">בחרו תחנה</option>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </>
              )}

              {form.assignment_type === 'judge' && (
                <>
                  <label style={S.label}>מקצים לשיפוט</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {DISCIPLINES.map(d => {
                      const active = form.judge_disciplines.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            judge_disciplines: active
                              ? form.judge_disciplines.filter(x => x !== d)
                              : [...form.judge_disciplines, d],
                          })}
                          style={S.discBtn(active)}
                        >
                          {disciplineLabel[d]}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

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
