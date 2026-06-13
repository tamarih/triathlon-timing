import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Participant, Event, Race } from '../../lib/types';
import { genderLabel, statusLabel, paymentLabel, calculateAge } from '../../lib/utils';
import { Search, Edit2, Download, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const statusOptions = ['registered','started','dns','dnf','dsq','finished'];
const paymentOptions = ['unpaid','paid','exempt'];

const statusBadge: Record<string, React.CSSProperties> = {
  registered: { background: '#f3f4f6', color: '#6b7280' },
  started: { background: '#dbeafe', color: '#1d4ed8' },
  finished: { background: '#dcfce7', color: '#15803d' },
  dnf: { background: '#fee2e2', color: '#dc2626' },
  dns: { background: '#f3f4f6', color: '#9ca3af' },
  dsq: { background: '#ede9fe', color: '#7c3aed' },
};
const paymentBadge: Record<string, React.CSSProperties> = {
  unpaid: { background: '#fee2e2', color: '#dc2626' },
  paid: { background: '#dcfce7', color: '#15803d' },
  exempt: { background: '#f3f4f6', color: '#6b7280' },
};

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  btnGroup: { display: 'flex', gap: 8 },
  outlineBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  filtersCard: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap' as const, gap: 10, alignItems: 'center' },
  filterSelect: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#374151', background: '#f9fafb', outline: 'none', fontFamily: 'system-ui' },
  searchWrap: { position: 'relative' as const },
  searchInput: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 32px 7px 10px', fontSize: 13, color: '#374151', background: '#f9fafb', outline: 'none', width: 160, fontFamily: 'system-ui' },
  searchIcon: { position: 'absolute' as const, right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' as const },
  tableWrap: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'right' as const, padding: '12px 14px', fontWeight: 700, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' as const },
  td: { padding: '11px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  badgeSelect: (style: React.CSSProperties) => ({ ...style, border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui' }),
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' as const },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 520, marginTop: 40, padding: 24 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#111827' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', marginBottom: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};

export default function Participants() {
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).then(({ data }) => setRaces(data || []));
    loadParticipants();
  }, [selectedEvent]);

  async function loadParticipants() {
    if (!selectedEvent) return;
    const { data } = await supabase.from('participants').select('*').eq('event_id', selectedEvent).order('bib_number');
    setParticipants(data || []);
  }

  async function updateParticipantField(id: string, field: string, value: string) {
    const { error } = await supabase.from('participants').update({ [field]: value }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('עודכן'); loadParticipants(); }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editParticipant) return;
    setSaving(true);
    const { id, created_at, updated_at, ...data } = editParticipant;
    const { error } = await supabase.from('participants').update(data).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('המשתתף עודכן'); setEditParticipant(null); loadParticipants(); }
    setSaving(false);
  }

  function exportExcel() {
    const data = getFiltered().map(p => ({
      'מספר משתתף': p.bib_number || '', 'שם פרטי': p.first_name, 'שם משפחה': p.last_name,
      'מין': genderLabel(p.gender), 'גיל': p.age || (p.birth_date ? calculateAge(p.birth_date) : ''),
      'טלפון': p.phone, 'דוא"ל': p.email, 'יישוב': p.city || '',
      'מקצה': races.find(r => r.id === p.race_id)?.name || '',
      'סטטוס': statusLabel(p.status), 'תשלום': paymentLabel(p.payment_status),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'משתתפים');
    XLSX.writeFile(wb, 'participants.xlsx');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let added = 0, skipped = 0;
      for (const row of rows) {
        const bib = String(row['מספר משתתף'] || row['bib_number'] || '').trim();
        if (bib) {
          const { data: existing } = await supabase.from('participants').select('id').eq('event_id', selectedEvent).eq('bib_number', bib);
          if (existing?.length) { skipped++; continue; }
        }
        const raceId = races.find(r => r.name === (row['מקצה'] || row['race']))?.id || races[0]?.id;
        await supabase.from('participants').insert({ event_id: selectedEvent, race_id: raceId || '', bib_number: bib || undefined, first_name: row['שם פרטי'] || '', last_name: row['שם משפחה'] || '', birth_date: row['תאריך לידה'] || '2000-01-01', gender: row['מין'] === 'נקבה' ? 'female' : 'male', phone: String(row['טלפון'] || ''), email: row['דוא"ל'] || '', health_declaration: true, rules_accepted: true, photo_consent: false });
        added++;
      }
      toast.success(`יובאו ${added} משתתפים${skipped ? `, דולגו ${skipped}` : ''}`);
      setShowImport(false); loadParticipants();
    };
    reader.readAsBinaryString(file);
  }

  function getFiltered() {
    return participants.filter(p => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return (!search || name.includes(search.toLowerCase()) || (p.bib_number || '').includes(search))
        && (!selectedRace || p.race_id === selectedRace)
        && (!statusFilter || p.status === statusFilter)
        && (!paymentFilter || p.payment_status === paymentFilter);
    });
  }

  const filtered = getFiltered();

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>משתתפים</span>
        <div style={S.btnGroup}>
          <button style={S.outlineBtn} onClick={() => setShowImport(true)}><Upload size={14} /> ייבוא Excel</button>
          <button style={S.outlineBtn} onClick={exportExcel}><Download size={14} /> ייצוא</button>
        </div>
      </div>

      <div style={S.filtersCard}>
        <select style={S.filterSelect} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select style={S.filterSelect} value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
          <option value="">כל המקצים</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select style={S.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select style={S.filterSelect} value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
          <option value="">כל התשלומים</option>
          {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
        </select>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}><Search size={14} /></span>
          <input style={S.searchInput} placeholder="חיפוש שם / מספר..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{filtered.length} משתתפים</span>
      </div>

      {showImport && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 380 }}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>ייבוא מ-Excel</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setShowImport(false)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>קובץ Excel עם עמודות: מספר משתתף, שם פרטי, שם משפחה, מין, טלפון, מקצה</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 10, fontSize: 13 }} />
          </div>
        </div>
      )}

      <div style={S.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['מס\'', 'שם', 'מקצה', 'מין/גיל', 'טלפון', 'סטטוס', 'תשלום', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ background: 'white' }}>
                  <td style={{ ...S.td, fontFamily: 'monospace', color: '#6b7280' }}>{p.bib_number || '—'}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>{p.first_name} {p.last_name}</td>
                  <td style={{ ...S.td, color: '#6b7280' }}>{races.find(r => r.id === p.race_id)?.name || '—'}</td>
                  <td style={{ ...S.td, color: '#6b7280' }}>{genderLabel(p.gender)} · {p.age || (p.birth_date ? calculateAge(p.birth_date) : '?')}</td>
                  <td style={{ ...S.td, color: '#9ca3af' }}>{p.phone}</td>
                  <td style={S.td}>
                    <select style={S.badgeSelect(statusBadge[p.status] || {})} value={p.status} onChange={e => updateParticipantField(p.id, 'status', e.target.value)}>
                      {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <select style={S.badgeSelect(paymentBadge[p.payment_status] || {})} value={p.payment_status} onChange={e => updateParticipantField(p.id, 'payment_status', e.target.value)}>
                      {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <button onClick={() => setEditParticipant(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6 }}><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>אין משתתפים</div>}
        </div>
      </div>

      {editParticipant && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>עריכת משתתף</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setEditParticipant(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveEdit}>
              <div style={S.grid2}>
                <div><label style={S.label}>שם פרטי</label><input style={S.input} value={editParticipant.first_name} onChange={e => setEditParticipant({...editParticipant, first_name: e.target.value})} required /></div>
                <div><label style={S.label}>שם משפחה</label><input style={S.input} value={editParticipant.last_name} onChange={e => setEditParticipant({...editParticipant, last_name: e.target.value})} required /></div>
              </div>
              <div style={S.grid2}>
                <div><label style={S.label}>מספר משתתף</label><input style={S.input} value={editParticipant.bib_number || ''} onChange={e => setEditParticipant({...editParticipant, bib_number: e.target.value})} /></div>
                <div><label style={S.label}>טלפון</label><input style={S.input} value={editParticipant.phone} onChange={e => setEditParticipant({...editParticipant, phone: e.target.value})} /></div>
              </div>
              <div style={S.grid2}>
                <div><label style={S.label}>דוא"ל</label><input style={S.input} value={editParticipant.email} onChange={e => setEditParticipant({...editParticipant, email: e.target.value})} /></div>
                <div><label style={S.label}>יישוב</label><input style={S.input} value={editParticipant.city || ''} onChange={e => setEditParticipant({...editParticipant, city: e.target.value})} /></div>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>סטטוס</label>
                  <select style={S.input} value={editParticipant.status} onChange={e => setEditParticipant({...editParticipant, status: e.target.value as any})}>
                    {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>תשלום</label>
                  <select style={S.input} value={editParticipant.payment_status} onChange={e => setEditParticipant({...editParticipant, payment_status: e.target.value as any})}>
                    {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
                  </select>
                </div>
              </div>
              <label style={S.label}>הערות</label>
              <input style={S.input} value={editParticipant.notes || ''} onChange={e => setEditParticipant({...editParticipant, notes: e.target.value})} />
              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={() => setEditParticipant(null)}>ביטול</button>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : 'שמירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
