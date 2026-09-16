import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Participant, Event, Race, Team } from '../../lib/types';
import { genderLabel, statusLabel, paymentLabel, calculateAge, raceDistanceLine, raceMeetingInfo, relayRoleLabel, relayLegLine, relayRoleEmojis, roleSet, hasRole } from '../../lib/utils';
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

const CONTACT_PHONE = '052-8073399'; // בן אהובי — for registration corrections

// Build a WhatsApp deep link, normalizing an Israeli phone to international (972).
function waUrl(phone: string | undefined, text: string): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('972')) { /* already international */ }
  else if (d.startsWith('0')) d = '972' + d.slice(1);
  else d = '972' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [addForm, setAddForm] = useState<any | null>(null);
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
    loadTeams();
    loadParticipants();
  }, [selectedEvent]);

  async function loadTeams() {
    if (!selectedEvent) return;
    const { data } = await supabase.from('teams').select('*').eq('event_id', selectedEvent);
    setTeams(data || []);
  }

  async function loadParticipants() {
    if (!selectedEvent) return;
    const { data } = await supabase.from('participants').select('*').eq('event_id', selectedEvent);
    // bib_number is TEXT, so sort numerically here (a text sort ranks 10 before 2).
    const sorted = (data || []).sort((a, b) => (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0));
    setParticipants(sorted);
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
    const { id, created_at: _ca, updated_at: _ua, ...data } = editParticipant as any;

    // Team (שלשה) handling.
    const relayRace = races.find(r => /שלשות|שליחים/.test(r.name));
    if (data.team_id === '__new__') {
      const name = newTeamName.trim();
      if (!name) { toast.error('הזיני שם לשלשה'); setSaving(false); return; }
      const { data: t, error: te } = await supabase.from('teams').insert({
        event_id: selectedEvent, race_id: relayRace?.id || data.race_id, name,
        contact_name: `${data.first_name} ${data.last_name}`.trim() || name,
        contact_phone: data.phone || '', contact_email: data.email || '',
      }).select().single();
      if (te || !t) { toast.error(te?.message || 'יצירת השלשה נכשלה'); setSaving(false); return; }
      data.team_id = t.id;
    }

    if (data.team_id) {
      // A relay member must have at least one role. Placement: anyone who swims
      // stays in the age race (with a pool lane, so they are counted in the
      // pool); a member who only cycles/runs moves to the שלשות race (no lane).
      const roles = roleSet(data.team_role);
      if (roles.length === 0) { toast.error('בחרי לפחות תפקיד אחד: שחיין / רוכב / רץ'); setSaving(false); return; }
      if (roles.includes('swimmer')) {
        if (!data.lane) {
          const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
          participants.filter(x => x.id !== id && x.race_id === data.race_id && x.lane).forEach(x => { counts[x.lane as number] = (counts[x.lane as number] || 0) + 1; });
          data.lane = Number(Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0]);
        }
      } else {
        if (relayRace) { data.race_id = relayRace.id; }
        data.lane = null;
      }
    } else {
      // Not part of a team → clear any leftover role.
      data.team_id = null;
      data.team_role = null;
    }

    const { error } = await supabase.from('participants').update(data).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('המשתתף עודכן'); setEditParticipant(null); setNewTeamName(''); loadTeams(); loadParticipants(); }
    setSaving(false);
  }

  // Manual registration (walk-ins on event day): suggest the next free bib.
  function openAdd() {
    const max = participants.reduce((m, p) => Math.max(m, Number(p.bib_number) || 0), 0);
    setAddForm({
      first_name: '', last_name: '', gender: 'male', birth_date: '', phone: '', email: '',
      city: '', race_id: selectedRace || races[0]?.id || '', recommended_category: '',
      bib_number: String(max + 1), status: 'registered', payment_status: 'exempt',
    });
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm) return;
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) { toast.error('שם פרטי ושם משפחה חובה'); return; }
    if (!addForm.race_id) { toast.error('בחרי מקצה'); return; }
    setSaving(true);
    const { error } = await supabase.from('participants').insert({
      event_id: selectedEvent,
      race_id: addForm.race_id,
      first_name: addForm.first_name.trim(),
      last_name: addForm.last_name.trim(),
      gender: addForm.gender || 'male',
      birth_date: addForm.birth_date || '2000-01-01',
      phone: addForm.phone || '',
      email: addForm.email || '',
      city: addForm.city || '',
      bib_number: addForm.bib_number ? String(addForm.bib_number).trim() : undefined,
      recommended_category: addForm.recommended_category || undefined,
      selected_category: addForm.recommended_category || undefined,
      status: addForm.status || 'registered',
      payment_status: addForm.payment_status || 'exempt',
      health_declaration: true, rules_accepted: true, photo_consent: false,
    });
    if (error) toast.error(error.code === '23505' ? 'מספר החזה כבר קיים — בחרי מספר אחר' : error.message);
    else { toast.success('המשתתף נוסף'); setAddForm(null); loadParticipants(); }
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

  async function printBarcodes() {
    const w = window.open('', '_blank'); // open synchronously to avoid popup blocking
    const toprint = filtered.filter(p => p.bib_number);
    // Include available reserve numbers (printed with a barcode but no name).
    const { data: reserveData } = await supabase
      .from('reserve_bibs').select('bib_number,status').eq('event_id', selectedEvent).eq('status', 'available');
    const reserves = (reserveData || []).sort((a, b) => (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0));
    if (toprint.length === 0 && reserves.length === 0) { w?.close(); toast.error('אין מספרים להדפסה'); return; }
    const partRows = toprint.map(p => {
      const rName = races.find(r => r.id === p.race_id)?.name || '';
      const race = rName.replace(/שליחים\s*ו/, '');
      const isRelay = !!p.team_id;
      const accent = isRelay ? '#7c3aed' : '';
      const cardStyle = accent ? `border-color:${accent};border-width:4px;` : '';
      const numStyle = accent ? `color:${accent};` : '';
      const tag = isRelay ? (race ? `שלשה · ${race}` : 'שלשה') : race;
      return `<div class="card" style="${cardStyle}">
        <svg class="barcode" data-bib="${p.bib_number}"></svg>
        <div class="num" style="${numStyle}">${p.bib_number}</div>
        <div class="name">${p.first_name} ${p.last_name}</div>
        <div class="race">${tag}</div>
      </div>`;
    }).join('');
    const reserveRows = reserves.map(r => `<div class="card">
        <svg class="barcode" data-bib="${r.bib_number}"></svg>
        <div class="num">${r.bib_number}</div>
        <div class="name">&nbsp;</div>
        <div class="race">רזרבה</div>
      </div>`).join('');
    const rows = partRows + reserveRows;
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>ברקודים</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
    <style>
      body { margin:0; font-family: system-ui, sans-serif; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      /* שני ברקודים לעמוד A4 - כל ברקוד בגודל חצי דף */
      .card {
        box-sizing:border-box;
        height:135mm;
        border:1px solid #ccc;
        border-radius:10px;
        padding:14mm 12mm;
        margin:6mm 0;
        text-align:center;
        break-inside:avoid;
        page-break-inside:avoid;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:8mm;
      }
      .barcode { width:90%; height:150px; }
      .num { font-size:150px; font-weight:900; line-height:1; }
      .name { font-size:30px; color:#333; }
      .race { font-size:22px; color:#666; }
      @media print { @page { size:A4; margin:10mm; } .card { margin:0 0 7mm; } }
    </style></head><body>
    ${rows}
    <script>
      document.querySelectorAll('.barcode').forEach(el => {
        JsBarcode(el, el.dataset.bib, { format:'CODE128', displayValue:false, margin:4, width:3, height:130 });
      });
      window.onload = () => window.print();
    <\/script></body></html>`;
    if (w) { w.document.write(html); w.document.close(); }
    else toast.error('החלון הקופץ נחסם — אפשרו חלונות קופצים לאתר');
  }

  async function autoAssignLanes() {
    const raceId = selectedRace;
    if (!raceId) { toast.error('בחרי מקצה תחילה'); return; }
    // Only swimmers get a lane — in relays the cyclist/runner never enter the pool.
    const pool = filtered.filter(p => p.race_id === raceId && (!p.team_id || hasRole(p.team_role, 'swimmer')));
    if (pool.length === 0) { toast.error('אין שחיינים לשיבוץ במקצה זה'); return; }
    if (pool.length > 20) { toast.error('יותר מ-20 משתתפים במקצה'); return; }
    const sorted = [...pool].sort((a, b) => (a.bib_number || '').localeCompare(b.bib_number || ''));
    const updates = sorted.map((p, i) => ({ id: p.id, lane: (i % 6) + 1 }));
    for (const u of updates) {
      await supabase.from('participants').update({ lane: u.lane }).eq('id', u.id);
    }
    toast.success(`הוקצו ${updates.length} משתתפים ל-6 מסלולים`);
    loadParticipants();
  }

  // Normalize every relay: the swimmer goes into the individual race matching
  // their age (counted in the pool); the cyclist and runner go into the
  // "שלשות" race with no lane.
  async function fixOldRelays() {
    const relayRace = races.find(r => r.name.includes('שלשות') || r.name.includes('שליחים'));
    const relayMembers = participants.filter(p => p.team_id);
    if (relayMembers.length === 0) { toast('אין שלשות לעדכון'); return; }
    const teams: Record<string, Participant[]> = {};
    for (const p of relayMembers) (teams[p.team_id as string] ||= []).push(p);
    let moved = 0, skipped = 0;
    const affectedRaces = new Set<string>();
    for (const members of Object.values(teams)) {
      const swimmer = members.find(m => hasRole(m.team_role, 'swimmer')) || members[0];
      const age = swimmer.age || (swimmer.birth_date ? calculateAge(swimmer.birth_date) : null);
      if (age == null) { skipped++; continue; }
      const matcher = age <= 8 ? 'ילדים א' : age <= 10 ? 'ילדים ב' : age <= 14 ? 'נוער' : 'קלאסי';
      const ageRace = races.find(r => r.name.includes(matcher) && !r.name.includes('שלשות') && !r.name.includes('שליחים') && r.type !== 'relay');
      for (const m of members) {
        if (hasRole(m.team_role, 'swimmer')) {
          if (ageRace && m.race_id !== ageRace.id) {
            await supabase.from('participants').update({ race_id: ageRace.id }).eq('id', m.id);
            moved++;
          }
          if (ageRace) affectedRaces.add(ageRace.id);
        } else if (relayRace && m.race_id !== relayRace.id) {
          await supabase.from('participants').update({ race_id: relayRace.id, lane: null }).eq('id', m.id);
          moved++;
        }
      }
    }
    // Rebalance pool lanes in the affected age races so a moved relay swimmer
    // doesn't collide with an existing swimmer on the same lane.
    let relaned = 0;
    for (const raceId of affectedRaces) {
      const { data: swimmers } = await supabase.from('participants')
        .select('id, bib_number, team_id, team_role').eq('race_id', raceId);
      const pool = (swimmers || [])
        .filter(p => !p.team_id || hasRole(p.team_role, 'swimmer'))
        .sort((a, b) => (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0));
      for (let i = 0; i < pool.length; i++) {
        await supabase.from('participants').update({ lane: (i % 6) + 1 }).eq('id', pool[i].id);
        relaned++;
      }
    }
    toast.success(`עודכנו ${moved} משתתפים · אוזנו ${relaned} מסלולים${skipped ? ` · ${skipped} דולגו` : ''}`);
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
        && (!categoryFilter || (p.recommended_category || '') === categoryFilter)
        && (!statusFilter || p.status === statusFilter)
        && (!approvalFilter || p.approval_status === approvalFilter);
    });
  }

  const filtered = getFiltered();
  const categoryOptions = [...new Set(participants.map(p => p.recommended_category).filter(Boolean))].sort() as string[];

  const eventName = events.find(e => e.id === selectedEvent)?.name || 'טריאתלון יקנעם 2026';
  function waMessage(p: Participant): string {
    // Relay members are filed under their leg's race (the swimmer under the age
    // race), so show them as a relay with their role instead of that race name.
    if (p.team_id) {
      // The relay's level follows the team's swimmer (their age race), so a kid
      // relay gets kid distances/assembly time, not the default classic ones.
      const swimmer = participants.find(x => x.team_id === p.team_id && hasRole(x.team_role, 'swimmer'));
      const levelRace = races.find(r => r.id === (swimmer?.race_id || p.race_id));
      const roleLabel = relayRoleLabel(p.team_role);
      const leg = relayLegLine(p.team_role, levelRace?.name);
      return `שלום ${p.first_name}, נרשמת ל${eventName} כחלק משלשה (שליחים).`
        + (roleLabel ? `\nהתפקיד שלך: ${roleLabel}` : '')
        + (p.bib_number ? `\nמספר חזה: ${p.bib_number}` : '')
        + (leg ? `\nהקטע שלך: ${leg}` : '')
        + `\n\n${raceMeetingInfo(levelRace)}`
        + `\n\nאם יש טעות או שמשהו לא נכון, אנא צרו קשר עם בן אהובי: ${CONTACT_PHONE}.`
        + `\nנתראה באירוע!`;
    }
    const race = races.find(r => r.id === p.race_id);
    const dist = raceDistanceLine(race);
    return `שלום ${p.first_name}, נרשמת ל${eventName}.\n`
      + `המקצה שלך: ${race?.name || ''}`
      + (p.bib_number ? `\nמספר חזה: ${p.bib_number}` : '')
      + (dist ? `\nמרחקים: ${dist}` : '')
      + `\n\n${raceMeetingInfo(race)}`
      + `\n\nאם יש טעות או שמשהו לא נכון, אנא צרו קשר עם בן אהובי: ${CONTACT_PHONE}.`
      + `\nנתראה באירוע!`;
  }

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
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }} onClick={openAdd}>➕ הוספת משתתף</button>
          <button style={{ ...S.outlineBtn, color: '#7c3aed', borderColor: '#c4b5fd' }} onClick={printBarcodes}>🖨️ ברקודים</button>
          <button style={{ ...S.outlineBtn, color: '#0369a1', borderColor: '#7dd3fc' }} onClick={autoAssignLanes}>🏊 הקצאת מסלולים</button>
          <button style={{ ...S.outlineBtn, color: '#7c3aed', borderColor: '#c4b5fd' }} onClick={fixOldRelays}>🔧 תקן שלשות</button>
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
        <select style={S.filterSelect} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">כל הקטגוריות</option>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
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
                {['מס\'', 'שם', 'מסלול', 'קטגוריה', 'מקצה', 'מקום מגורים', 'מין/גיל', 'טלפון', 'סטטוס', 'אישור', ''].map(h => (
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
                  <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>
                    {p.first_name} {p.last_name}
                    {p.team_role && (
                      <span style={{ marginRight: 6, fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>
                        {relayRoleEmojis(p.team_role)}
                      </span>
                    )}
                  </td>
                  <td style={S.td}>
                    <select
                      value={p.lane ?? ''}
                      onChange={e => updateParticipantField(p.id, 'lane', e.target.value || null as any)}
                      style={{ background: p.lane ? '#dbeafe' : '#f3f4f6', color: p.lane ? '#1d4ed8' : '#9ca3af', border: 'none', borderRadius: 20, padding: '3px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui', outline: 'none' }}
                    >
                      <option value="">—</option>
                      {[1,2,3,4,5,6].map(l => <option key={l} value={l}>מסלול {l}</option>)}
                    </select>
                  </td>
                  <td style={{ ...S.td, color: '#6b7280', fontSize: 12 }}>{p.recommended_category || '—'}</td>
                  <td style={{ ...S.td, color: '#6b7280' }}>{races.find(r => r.id === p.race_id)?.name || '—'}</td>
                  <td style={{ ...S.td, color: '#6b7280' }}>{p.city || '—'}</td>
                  <td style={{ ...S.td, color: '#6b7280' }}>{genderLabel(p.gender)} · {p.age || (p.birth_date ? calculateAge(p.birth_date) : '?')}</td>
                  <td style={{ ...S.td, color: '#9ca3af' }}>{p.phone}</td>
                  <td style={S.td}>
                    <select style={S.badgeSelect(statusBadge[p.status] || {})} value={p.status} onChange={e => updateParticipantField(p.id, 'status', e.target.value)}>
                      {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
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
                      {waUrl(p.phone, waMessage(p)) && (
                        <a href={waUrl(p.phone, waMessage(p))!} target="_blank" rel="noopener noreferrer" title="שליחת וואטסאפ עם המקצה"
                          style={{ background: '#25D366', border: '1px solid #1eb959', cursor: 'pointer', color: 'white', padding: '5px 8px', borderRadius: 7, display: 'flex', alignItems: 'center', textDecoration: 'none', fontSize: 13 }}>💬</a>
                      )}
                      <button onClick={() => { setNewTeamName(''); setEditParticipant(p); }} title="עריכה" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', cursor: 'pointer', color: '#374151', padding: '5px 7px', borderRadius: 7, display: 'flex', alignItems: 'center' }}><Edit2 size={14} /></button>
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
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} onClick={() => { setEditParticipant(null); setNewTeamName(''); }}><X size={18} /></button>
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
                  <label style={S.label}>מין</label>
                  <select style={S.input} value={editParticipant.gender} onChange={e => setEditParticipant({...editParticipant, gender: e.target.value as any})}>
                    <option value="male">זכר</option>
                    <option value="female">נקבה</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>קטגוריה</label>
                  <select style={S.input} value={editParticipant.recommended_category || ''} onChange={e => setEditParticipant({...editParticipant, recommended_category: e.target.value || undefined, selected_category: e.target.value || undefined})}>
                    <option value="">ללא</option>
                    {['ילדים א','ילדים ב','נוער','בוגרים'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>תאריך לידה</label>
                  <input type="date" style={S.input} value={editParticipant.birth_date || ''} onChange={e => setEditParticipant({...editParticipant, birth_date: e.target.value})} />
                </div>
                <div>
                  <label style={S.label}>גיל (מחושב)</label>
                  <input style={{ ...S.input, background: '#eef2f7', color: '#6b7280' }} value={editParticipant.birth_date ? calculateAge(editParticipant.birth_date) : (editParticipant.age ?? '')} readOnly />
                </div>
              </div>
              <div>
                <label style={S.label}>מקצה</label>
                <select style={S.input} value={editParticipant.race_id || ''} onChange={e => setEditParticipant({...editParticipant, race_id: e.target.value})}>
                  {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', marginBottom: 10 }}>🏅 שלשה (שליחים)</div>
                <div style={S.grid2}>
                  <div>
                    <label style={S.label}>תפקיד בשלשה (אפשר לבחור כמה)</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                      {([['swimmer','🏊 שחיין'],['cyclist','🚴 רוכב'],['runner','🏃 רץ']] as const).map(([val, lbl]) => {
                        const active = roleSet(editParticipant.team_role).includes(val);
                        return (
                          <button key={val} type="button"
                            onClick={() => {
                              const cur = roleSet(editParticipant.team_role);
                              const next = cur.includes(val) ? cur.filter(r => r !== val) : [...cur, val];
                              const ordered = ['swimmer','cyclist','runner'].filter(r => next.includes(r));
                              setEditParticipant({ ...editParticipant, team_role: ordered.join('+') || undefined });
                            }}
                            style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' as const, border: `1.5px solid ${active ? '#7c3aed' : '#e5e7eb'}`, background: active ? '#7c3aed' : '#f9fafb', color: active ? 'white' : '#374151', borderRadius: 10, padding: '9px 6px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui' }}
                          >{lbl}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>שיוך לשלשה</label>
                    <select style={{ ...S.input, marginBottom: 0 }} value={editParticipant.team_id || ''} onChange={e => setEditParticipant({...editParticipant, team_id: e.target.value || undefined})}>
                      <option value="">ללא שלשה</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.team_number ? ` (${t.team_number})` : ''}</option>)}
                      <option value="__new__">➕ צור שלשה חדשה…</option>
                    </select>
                  </div>
                </div>
                {editParticipant.team_id === '__new__' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={S.label}>שם השלשה החדשה</label>
                    <input style={{ ...S.input, marginBottom: 0 }} value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="לדוגמה: הנחשונים" />
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 10, lineHeight: 1.5 }}>
                  לשלשה מלאה: צרו שלשה אחת, שייכו אליה 3 משתתפים (שחיין, רוכב, רץ), ואז לחצו על "תקן שלשות" כדי לשבץ אוטומטית — השחיין למקצה הגיל בבריכה, והרוכב והרץ למקצה השלשות.
                </div>
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
                <button type="button" style={S.btnSecondary} onClick={() => { setEditParticipant(null); setNewTeamName(''); }}>ביטול</button>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : 'שמירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addForm && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>➕ רישום משתתף חדש</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setAddForm(null)}><X size={18} /></button>
            </div>
            <form onSubmit={addParticipant}>
              <div style={S.grid2}>
                <div><label style={S.label}>שם פרטי *</label><input style={S.input} value={addForm.first_name} onChange={e => setAddForm({...addForm, first_name: e.target.value})} required /></div>
                <div><label style={S.label}>שם משפחה *</label><input style={S.input} value={addForm.last_name} onChange={e => setAddForm({...addForm, last_name: e.target.value})} required /></div>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>מקצה *</label>
                  <select style={S.input} value={addForm.race_id} onChange={e => setAddForm({...addForm, race_id: e.target.value})} required>
                    <option value="">בחרי מקצה</option>
                    {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>מספר חזה</label><input style={S.input} value={addForm.bib_number} onChange={e => setAddForm({...addForm, bib_number: e.target.value})} /></div>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>מין</label>
                  <select style={S.input} value={addForm.gender} onChange={e => setAddForm({...addForm, gender: e.target.value})}>
                    <option value="male">זכר</option>
                    <option value="female">נקבה</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>קטגוריה</label>
                  <select style={S.input} value={addForm.recommended_category} onChange={e => setAddForm({...addForm, recommended_category: e.target.value})}>
                    <option value="">ללא</option>
                    {['ילדים א','ילדים ב','נוער','בוגרים'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.grid2}>
                <div><label style={S.label}>תאריך לידה</label><input type="date" style={S.input} value={addForm.birth_date} onChange={e => setAddForm({...addForm, birth_date: e.target.value})} /></div>
                <div><label style={S.label}>טלפון</label><input style={S.input} value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} /></div>
              </div>
              <div style={S.grid2}>
                <div><label style={S.label}>דוא"ל</label><input style={S.input} value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} /></div>
                <div><label style={S.label}>יישוב</label><input style={S.input} value={addForm.city} onChange={e => setAddForm({...addForm, city: e.target.value})} /></div>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>סטטוס</label>
                  <select style={S.input} value={addForm.status} onChange={e => setAddForm({...addForm, status: e.target.value})}>
                    {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>תשלום</label>
                  <select style={S.input} value={addForm.payment_status} onChange={e => setAddForm({...addForm, payment_status: e.target.value})}>
                    {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={() => setAddForm(null)}>ביטול</button>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : 'רישום'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
