import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Equipment, RoleCategory } from '../../lib/types';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_COLOR } from '../../lib/roles';

const S = {
  page: { padding: '0 0 40px', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 900, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  card: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const },
  eventSelect: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 14, color: '#111827', background: 'white', outline: 'none', fontFamily: 'system-ui', minWidth: 200 },
  catCard: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '18px', marginBottom: 14 },
  catHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  catTitle: { fontSize: 16, fontWeight: 800, color: '#111827' },
  catBadge: (cat: RoleCategory) => ({ fontSize: 11, background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].fg, borderRadius: 999, padding: '3px 10px', fontWeight: 700 }),
  miniAdd: { display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', color: '#1d4ed8', border: '1.5px dashed #bfdbfe', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6, background: '#fafafa', border: '1px solid #f3f4f6', flexWrap: 'wrap' as const },
  name: { fontSize: 14, fontWeight: 700, color: '#111827', flex: '1 1 auto' as const, minWidth: 140 },
  qty: { fontSize: 13, color: '#374151', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontWeight: 600 },
  notes: { fontSize: 12, color: '#6b7280', flexBasis: '100%' as const },
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
};

interface FormState {
  category: RoleCategory;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

const EMPTY_FORM: FormState = { category: 'catering', name: '', quantity: '', unit: '', notes: '' };

export default function EquipmentPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState<Equipment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (eventId) loadItems(); else setItems([]); }, [eventId]);

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false });
    setEvents(data || []);
    if (data && data.length && !eventId) setEventId(data[0].id);
  }

  async function loadItems() {
    const { data } = await supabase.from('equipment').select('*').eq('event_id', eventId).order('sort_order');
    setItems(data || []);
  }

  const itemsByCategory = useMemo(() => {
    const map: Record<RoleCategory, Equipment[]> = { pool: [], bike: [], run: [], catering: [], closures: [], extras: [], other: [] };
    for (const i of items) map[i.category].push(i);
    return map;
  }, [items]);

  function openModal(cat: RoleCategory, eq: Equipment | null) {
    setEditing(eq);
    setForm(eq ? { category: eq.category, name: eq.name, quantity: eq.quantity || '', unit: eq.unit || '', notes: eq.notes || '' } : { ...EMPTY_FORM, category: cat });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false); setEditing(null); setForm(EMPTY_FORM);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    if (!form.name.trim()) return;
    const payload = {
      event_id: eventId,
      category: form.category,
      name: form.name.trim(),
      quantity: form.quantity.trim() || null,
      unit: form.unit.trim() || null,
      notes: form.notes.trim() || null,
      sort_order: editing ? editing.sort_order : itemsByCategory[form.category].length,
    };
    if (editing) {
      const { error } = await supabase.from('equipment').update(payload).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('עודכן');
    } else {
      const { error } = await supabase.from('equipment').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('נוסף');
    }
    closeModal(); loadItems();
  }

  async function remove(eq: Equipment) {
    if (!confirm(`למחוק "${eq.name}"?`)) return;
    const { error } = await supabase.from('equipment').delete().eq('id', eq.id);
    if (error) toast.error(error.message);
    else { toast.success('נמחק'); loadItems(); }
  }

  if (events.length === 0) {
    return (
      <div style={S.page}>
        <div style={S.title}>ציוד</div>
        <div style={S.card}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>אין אירועים. צרו אירוע ראשון במסך "אירועים".</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.title}>ציוד וכמויות</div>

      <div style={S.card}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>אירוע:</label>
            <select style={S.eventSelect} value={eventId} onChange={e => setEventId(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.date).toLocaleDateString('he-IL')})</option>)}
            </select>
          </div>
        </div>
      </div>

      {CATEGORIES.map(cat => {
        const list = itemsByCategory[cat];
        return (
          <div key={cat} style={S.catCard}>
            <div style={S.catHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={S.catTitle}>{CATEGORY_LABEL[cat]}</span>
                <span style={S.catBadge(cat)}>{list.length}</span>
              </div>
              <button style={S.miniAdd} onClick={() => openModal(cat, null)}>
                <Plus size={12} /> פריט
              </button>
            </div>

            {list.length === 0 && (
              <div style={{ fontSize: 12, color: '#9ca3af', padding: '6px 4px' }}>אין פריטים בקטגוריה זו.</div>
            )}

            {list.map(eq => (
              <div key={eq.id} style={S.row}>
                <div style={S.name}>{eq.name}</div>
                {(eq.quantity || eq.unit) && (
                  <span style={S.qty}>
                    {eq.quantity} {eq.unit}
                  </span>
                )}
                <button style={S.iconBtn} onClick={() => openModal(cat, eq)} title="עריכה"><Pencil size={12} /></button>
                <button style={S.iconBtnDanger} onClick={() => remove(eq)} title="מחיקה"><Trash2 size={12} /></button>
                {eq.notes && <div style={S.notes}>{eq.notes}</div>}
              </div>
            ))}
          </div>
        );
      })}

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>{editing ? 'עריכת פריט' : 'פריט חדש'}</span>
              <button style={S.closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <label style={S.label}>קטגוריה</label>
              <select style={S.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as RoleCategory })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>

              <label style={S.label}>שם הפריט</label>
              <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus placeholder="לדוגמה: מים" />

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={S.label}>כמות</label>
                  <input style={S.input} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder='200' />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>יחידה</label>
                  <input style={S.input} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder='בקבוקים' />
                </div>
              </div>

              <label style={S.label}>הערות</label>
              <input style={S.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="אופציונלי" />

              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={closeModal}>ביטול</button>
                <button type="submit" style={S.btnPrimary}>{editing ? 'עדכון' : 'יצירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
