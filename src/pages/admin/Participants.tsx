import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Participant, Event, Race } from '../../lib/types';
import { genderLabel, statusLabel, paymentLabel, calculateAge } from '../../lib/utils';
import { Search, Edit2, Download, Upload, X, Trash2 } from 'lucide-react';
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
  const [approvalFilter, setApprovalFilter] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState<Participant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<'single' | 'multi' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
    const { id, created_at: _ca, updated_at: _ua, ...data } = editParticipant;
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

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const ids = filtered.map(p => p.id);
    if (ids.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  }

  async function deleteOne(id: string) {
    const { error } = await supabase.from('participants').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('משתתף נמחק'); loadParticipants(); }
    setConfirmDelete(null);
    setDeleteTarget(null);
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('participants').delete().in('id', ids);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} משתתפים נמחקו`); setSelectedIds(new Set()); loadParticipants(); }
    setConfirmDelete(null);
  }

  async function autoAssignLanes() {
    const raceId = selectedRace;
    if (!raceId) { toast.error('בחרי מקצה תחילה'); return; }
    const pool = filtered.filter(p => p.race_id === raceId);
    if (pool.length === 0) { toast.error('אין משתתפים במקצה זה'); return; }
    if (pool.length > 20) { toast.error('יותר מ-20 משתתפים במקצה'); return; }
    const sorted = [...pool].sort((a, b) => (a.bib_number || '').localeCompare(b.bib_number || ''));
    const updates = sorted.map((p, i) => ({ id: p.id, lane: (i % 6) + 1 }));
    for (const u of updates) {
      await supabase.from('participants').update({ lane: u.lane }).eq('id', u.id);
    }
    toast.success(`הוקצו ${updates.length} משתתפים ל-6 מסלולים`);
    loadParticipants();
  }

  async function approveParticipant(p: Participant, status: 'approved' | 'rejected') {
    const { error } = await supabase.from('participants').update({
      approval_status: status,
      approval_notes: approvalNotes || null,
    }).eq('id', p.id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === 'approved' ? '✅ אושרה הרשמה' : '❌ הרשמה נדחתה');
      setShowApprovalModal(null);
      setApprovalNotes('');
      loadParticipants();
    }
  }

  const pendingCount = participants.filter(p => p.approval_status === 'pending').length;

  function getFiltered() {
    return participants.filter(p => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return (!search || name.includes(search.toLowerCase()) || (p.bib_number || '').includes(search))
        && (!selectedRace || p.race_id === selectedRace)
        && (!statusFilter || p.status === statusFilter)
        && (!paymentFilter || p.payment_status === paymentFilter)
        && (!approvalFilter || p.approval_status === approvalFilter);
    });
  }

  const filtered = getFiltered();

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>משתתפים</span>
        <div style={S.btnGroup}>
          {selectedIds.size > 0 && (
            <button
              style={{ ...S.outlineBtn, color: '#dc2626', borderColor: '#fca5a5' }}
              onClick={() => setConfirmDelete('multi')}
            ><Trash2 size={14} /> מחק נבחרים ({selectedIds.size})</button>
          )}
          <button style={{ ...S.outlineBtn, color: '#0369a1', borderColor: '#7dd3fc' }} onClick={autoAssignLanes}>🏊 הקצאת מסלולים</button>
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
        <select style={S.filterSelect} value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}>
          <option value="">כל האישורים</option>
          <option value="pending">⏳ ממתין לאישור</option>
          <option value="approved">✅ אושר</option>
          <option value="rejected">❌ נדחה</option>
        </select>
        {pendingCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#92400e', borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }} onClick={() => setApprovalFilter('pending')}>
            ⏳ {pendingCount} ממתינים לאישור
          </span>
        )}
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
                <th style={S.th}>
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                {['מס\'', 'שם', 'מסלול', 'קטגוריה', 'מקצה', 'מין/גיל', 'טלפון', 'סטטוס', 'תשלום', 'אישור', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ background: selectedIds.has(p.id) ? '#eff6ff' : 'white' }}>
                  <td style={S.td}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td style={{ ...S.td, fontFamily: 'monospace', color: '#6b7280' }}>{p.bib_number || '—'}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>{p.first_name} {p.last_name}</td>
                  <td style={S.td}>
                    {p.lane ? <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>מסלול {p.lane}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ ...S.td, color: '#6b7280', fontSize: 12 }}>{p.recommended_category || '—'}</td>
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
                    {p.approval_status === 'pending' ? (
                      <button
                        onClick={() => { setShowApprovalModal(p); setApprovalNotes(''); }}
                        style={{ fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontFamily: 'system-ui' }}
                      >⏳ אישור</button>
                    ) : p.approval_status === 'approved' ? (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '3px 10px' }}>✅ אושר</span>
                    ) : p.approval_status === 'rejected' ? (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '3px 10px' }}>❌ נדחה</span>
                    ) : null}
                  </td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' as const }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditParticipant(p)} title="עריכה" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', cursor: 'pointer', color: '#374151', padding: '5px 7px', borderRadius: 7, display: 'flex', alignItems: 'center' }}><Edit2 size={14} /></button>
                      <button onClick={() => { setDeleteTarget(p.id); setConfirmDelete('single'); }} title="מחיקה" style={{ background: '#fee2e2', border: '1px solid #fecaca', cursor: 'pointer', color: '#dc2626', padding: '5px 7px', borderRadius: 7, display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>אין משתתפים</div>}
        </div>
      </div>

      {showApprovalModal && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 420 }}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>בקשת אישור — {showApprovalModal.first_name} {showApprovalModal.last_name}</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setShowApprovalModal(null)}><X size={18} /></button>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#6b7280' }}>קטגוריית גיל: </span>
                <span style={{ fontWeight: 700 }}>{showApprovalModal.recommended_category || '—'}</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#6b7280' }}>מקצה שנבחר: </span>
                <span style={{ fontWeight: 700 }}>{showApprovalModal.selected_category || races.find(r => r.id === showApprovalModal.race_id)?.name || '—'}</span>
              </div>
              {showApprovalModal.approval_reason && (
                <div>
                  <span style={{ color: '#6b7280' }}>סיבה: </span>
                  <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{showApprovalModal.approval_reason}</span>
                </div>
              )}
            </div>
            <label style={S.label}>הערות (אופציונלי)</label>
            <input
              style={{ ...S.input, marginBottom: 20 }}
              value={approvalNotes}
              onChange={e => setApprovalNotes(e.target.value)}
              placeholder="הערה לנרשם..."
            />
            <div style={S.btnRow}>
              <button
                style={{ ...S.btnSecondary, color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => approveParticipant(showApprovalModal, 'rejected')}
              >❌ דחייה</button>
              <button
                style={{ ...S.btnPrimary, background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}
                onClick={() => approveParticipant(showApprovalModal, 'approved')}
              >✅ אישור</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 360 }}>
            <div style={S.modalHeader}>
              <span style={{ ...S.modalTitle, color: '#dc2626' }}>אישור מחיקה</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
              {confirmDelete === 'single'
                ? 'האם למחוק את המשתתף? פעולה זו אינה הפיכה.'
                : `האם למחוק ${selectedIds.size} משתתפים? פעולה זו אינה הפיכה.`}
            </p>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => setConfirmDelete(null)}>ביטול</button>
              <button
                style={{ ...S.btnPrimary, background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}
                onClick={() => confirmDelete === 'single' && deleteTarget ? deleteOne(deleteTarget) : deleteSelected()}
              >מחק</button>
            </div>
          </div>
        </div>
      )}

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
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>מסלול בריכה</label>
                  <select style={S.input} value={editParticipant.lane ?? ''} onChange={e => setEditParticipant({...editParticipant, lane: e.target.value ? Number(e.target.value) : undefined})}>
                    <option value="">ללא</option>
                    {[1,2,3,4,5,6].map(l => <option key={l} value={l}>מסלול {l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>הערות</label>
                  <input style={S.input} value={editParticipant.notes || ''} onChange={e => setEditParticipant({...editParticipant, notes: e.target.value})} />
                </div>
              </div>
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
