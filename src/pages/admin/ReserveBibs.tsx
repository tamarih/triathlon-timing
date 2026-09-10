import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Participant, ReserveBib } from '../../lib/types';
import { Plus, X, Search, Link2, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 760, margin: '0 auto', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  bar: { background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' },
  createBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  numInput: { width: 64, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, textAlign: 'center' as const, fontFamily: 'system-ui', outline: 'none' },
  card: { background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' },
  bibNum: { fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: '#111827', minWidth: 56 },
  pill: (assigned: boolean) => ({ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 12px', background: assigned ? '#dcfce7' : '#f3f4f6', color: assigned ? '#15803d' : '#6b7280', whiteSpace: 'nowrap' as const }),
  actionBtn: (danger?: boolean) => ({ display: 'flex', alignItems: 'center', gap: 5, background: danger ? '#fee2e2' : '#eff6ff', color: danger ? '#b91c1c' : '#1d4ed8', border: `1.5px solid ${danger ? '#fecaca' : '#bfdbfe'}`, borderRadius: 9, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui', whiteSpace: 'nowrap' as const }),
  empty: { textAlign: 'center' as const, padding: 40, color: '#9ca3af', fontSize: 14 },
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440, padding: 22, maxHeight: '90vh', overflowY: 'auto' as const },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: '#111827' },
  searchWrap: { position: 'relative' as const, marginBottom: 10 },
  searchInput: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '9px 34px 9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui' },
  searchIcon: { position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
  pRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: '1px solid #f3f4f6', marginBottom: 6 },
  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnDanger: { flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};

export default function ReserveBibs() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [reserves, setReserves] = useState<ReserveBib[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [assignTarget, setAssignTarget] = useState<ReserveBib | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<ReserveBib | null>(null);
  const [pSearch, setPSearch] = useState('');

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setEventId(data[0].id);
    });
  }, []);

  useEffect(() => { if (eventId) load(); }, [eventId]);

  async function load() {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('reserve_bibs').select('*').eq('event_id', eventId),
      supabase.from('participants').select('*').eq('event_id', eventId),
    ]);
    setReserves((r || []).sort((a, b) => (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0)));
    setParticipants(p || []);
  }

  const pName = (id?: string | null) => {
    const p = participants.find(x => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };

  async function createReserves() {
    if (!eventId || count < 1) return;
    setBusy(true);
    try {
      const partMax = participants.reduce((m, p) => Math.max(m, Number(p.bib_number) || 0), 0);
      const resMax = reserves.reduce((m, r) => Math.max(m, Number(r.bib_number) || 0), 0);
      const start = Math.max(partMax, resMax) + 1;
      const rows = Array.from({ length: count }, (_, i) => ({
        event_id: eventId, bib_number: String(start + i), status: 'available',
      }));
      const { error } = await supabase.from('reserve_bibs').insert(rows);
      if (error) throw error;
      toast.success(`נוצרו ${count} מספרי רזרבה (${start}–${start + count - 1})`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה ביצירת מספרי רזרבה');
    } finally {
      setBusy(false);
    }
  }

  async function assignTo(participant: Participant) {
    if (!assignTarget) return;
    setBusy(true);
    try {
      // Point the participant at the reserve number; mark the reserve assigned.
      const { error: e1 } = await supabase.from('participants').update({ bib_number: assignTarget.bib_number }).eq('id', participant.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('reserve_bibs').update({ status: 'assigned', participant_id: participant.id }).eq('id', assignTarget.id);
      if (e2) throw e2;
      toast.success(`מספר ${assignTarget.bib_number} שויך ל${participant.first_name} ${participant.last_name}`);
      setAssignTarget(null); setPSearch('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בשיוך');
    } finally {
      setBusy(false);
    }
  }

  async function doUnassign() {
    if (!unassignTarget) return;
    setBusy(true);
    try {
      if (unassignTarget.participant_id) {
        await supabase.from('participants').update({ bib_number: null }).eq('id', unassignTarget.participant_id);
      }
      const { error } = await supabase.from('reserve_bibs').update({ status: 'available', participant_id: null }).eq('id', unassignTarget.id);
      if (error) throw error;
      toast.success(`מספר ${unassignTarget.bib_number} חזר לפנוי`);
      setUnassignTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בביטול השיוך');
    } finally {
      setBusy(false);
    }
  }

  // Participants offered for assignment: sorted by highest bib first (newest),
  // filtered by the search text.
  const assignablePool = useMemo(() => {
    const q = pSearch.trim().toLowerCase();
    return [...participants]
      .filter(p => {
        if (!q) return true;
        return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.bib_number || '').includes(q);
      })
      .sort((a, b) => (Number(b.bib_number) || 0) - (Number(a.bib_number) || 0));
  }, [participants, pSearch]);

  const availableCount = reserves.filter(r => r.status === 'available').length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>🎟️ מספרי רזרבה</span>
        <select style={S.select} value={eventId} onChange={e => setEventId(e.target.value)}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      <div style={S.bar}>
        <span style={{ fontSize: 13, color: '#374151' }}>צור</span>
        <input style={S.numInput} type="number" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))} />
        <span style={{ fontSize: 13, color: '#374151' }}>מספרי רזרבה נוספים (מעל המספר הגבוה ביותר)</span>
        <button style={{ ...S.createBtn, opacity: busy ? 0.6 : 1 }} onClick={createReserves} disabled={busy}>
          <Plus size={15} /> צור
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        {reserves.length} מספרי רזרבה · <span style={{ color: '#15803d', fontWeight: 600 }}>{availableCount} פנויים</span> · {reserves.length - availableCount} משויכים
      </div>

      <div style={S.card}>
        {reserves.length === 0 && <div style={S.empty}>אין עדיין מספרי רזרבה. לחצו "צור" כדי להוסיף.</div>}
        {reserves.map(r => {
          const assigned = r.status === 'assigned';
          return (
            <div key={r.id} style={S.row}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={S.bibNum}>{r.bib_number}</span>
                <span style={S.pill(assigned)}>{assigned ? `משויך ל${pName(r.participant_id)}` : 'פנוי'}</span>
              </div>
              {assigned ? (
                <button style={S.actionBtn(true)} onClick={() => setUnassignTarget(r)}><Unlink size={13} /> בטל שיוך</button>
              ) : (
                <button style={S.actionBtn()} onClick={() => { setAssignTarget(r); setPSearch(''); }}><Link2 size={13} /> שייך למשתתף</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Assign modal */}
      {assignTarget && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>שיוך מספר {assignTarget.bib_number}</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => setAssignTarget(null)}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>בחרו את המשתתף שיקבל את מספר {assignTarget.bib_number} (הברקוד המודפס לא משתנה).</div>
            <div style={S.searchWrap}>
              <input style={S.searchInput} placeholder="חיפוש שם / מספר..." value={pSearch} onChange={e => setPSearch(e.target.value)} autoFocus />
              <Search size={16} style={S.searchIcon} />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {assignablePool.length === 0 && <div style={{ ...S.empty, padding: 20 }}>לא נמצאו משתתפים</div>}
              {assignablePool.slice(0, 50).map(p => (
                <div key={p.id} style={S.pRow} onClick={() => !busy && assignTo(p)}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{p.first_name} {p.last_name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>מס' נוכחי: {p.bib_number || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unassign confirm */}
      {unassignTarget && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 360 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🔓</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>ביטול שיוך מספר {unassignTarget.bib_number}</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                המספר יחזור לסטטוס "פנוי", ו{pName(unassignTarget.participant_id)} יישאר ללא מספר מודפס.
              </div>
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => setUnassignTarget(null)}>ביטול</button>
              <button style={S.btnDanger} onClick={doUnassign} disabled={busy}>{busy ? '...' : 'בטל שיוך'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
