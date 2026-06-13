import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Participant, Event, Race } from '../../lib/types';
import { genderLabel, statusLabel, paymentLabel, calculateAge } from '../../lib/utils';
import { Search, Edit2, Download, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const statusOptions = ['registered','started','dns','dnf','dsq','finished'];
const paymentOptions = ['unpaid','paid','exempt'];
const statusColors: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-600', started: 'bg-blue-100 text-blue-700',
  finished: 'bg-green-100 text-green-700', dnf: 'bg-red-100 text-red-600',
  dns: 'bg-gray-100 text-gray-500', dsq: 'bg-purple-100 text-purple-700',
};
const paymentColors: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-600', paid: 'bg-green-100 text-green-700', exempt: 'bg-gray-100 text-gray-500',
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
    else {
      toast.success('עודכן');
      loadParticipants();
    }
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
    const filtered = getFiltered();
    const data = filtered.map(p => ({
      'מספר משתתף': p.bib_number || '',
      'שם פרטי': p.first_name,
      'שם משפחה': p.last_name,
      'מין': genderLabel(p.gender),
      'גיל': p.age || (p.birth_date ? calculateAge(p.birth_date) : ''),
      'טלפון': p.phone,
      'דוא"ל': p.email,
      'יישוב': p.city || '',
      'מקצה': races.find(r => r.id === p.race_id)?.name || '',
      'סטטוס': statusLabel(p.status),
      'תשלום': paymentLabel(p.payment_status),
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
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      let added = 0, skipped = 0;
      for (const row of rows) {
        const bib = String(row['מספר משתתף'] || row['bib_number'] || '').trim();
        if (bib) {
          const { data: existing } = await supabase.from('participants').select('id').eq('event_id', selectedEvent).eq('bib_number', bib);
          if (existing?.length) { skipped++; continue; }
        }
        const raceId = races.find(r => r.name === (row['מקצה'] || row['race']))?.id || races[0]?.id;
        await supabase.from('participants').insert({
          event_id: selectedEvent, race_id: raceId || '',
          bib_number: bib || undefined,
          first_name: row['שם פרטי'] || row['first_name'] || '',
          last_name: row['שם משפחה'] || row['last_name'] || '',
          birth_date: row['תאריך לידה'] || '2000-01-01',
          gender: row['מין'] === 'נקבה' ? 'female' : 'male',
          phone: String(row['טלפון'] || row['phone'] || ''),
          email: row['דוא"ל'] || row['email'] || '',
          health_declaration: true, rules_accepted: true, photo_consent: false,
        });
        added++;
      }
      toast.success(`יובאו ${added} משתתפים${skipped ? `, דולגו ${skipped} כפילויות` : ''}`);
      setShowImport(false);
      loadParticipants();
    };
    reader.readAsBinaryString(file);
  }

  function getFiltered() {
    return participants.filter(p => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      const bib = p.bib_number || '';
      const matchSearch = !search || name.includes(search.toLowerCase()) || bib.includes(search);
      const matchRace = !selectedRace || p.race_id === selectedRace;
      const matchStatus = !statusFilter || p.status === statusFilter;
      const matchPayment = !paymentFilter || p.payment_status === paymentFilter;
      return matchSearch && matchRace && matchStatus && matchPayment;
    });
  }

  const filtered = getFiltered();

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">משתתפים</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Upload size={15} /> ייבוא Excel
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Download size={15} /> ייצוא
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">כל המקצים</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">כל הסטטוסים</option>
          {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">כל התשלומים</option>
          {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
        </select>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pr-8 pl-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-44" />
        </div>
        <span className="text-sm text-gray-500 self-center">{filtered.length} משתתפים</span>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">ייבוא מ-Excel</h3>
              <button onClick={() => setShowImport(false)}><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">קובץ Excel עם עמודות: מספר משתתף, שם פרטי, שם משפחה, מין, טלפון, מקצה</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מס'</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">מקצה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">מין/גיל</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">טלפון</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תשלום</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">{p.bib_number || '—'}</td>
                  <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{races.find(r => r.id === p.race_id)?.name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {genderLabel(p.gender)} · {p.age || (p.birth_date ? calculateAge(p.birth_date) : '?')}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{p.phone}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={e => updateParticipantField(p.id, 'status', e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[p.status]}`}
                    >
                      {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.payment_status}
                      onChange={e => updateParticipantField(p.id, 'payment_status', e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${paymentColors[p.payment_status]}`}
                    >
                      {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditParticipant(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">אין משתתפים</div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editParticipant && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mt-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">עריכת משתתף</h2>
                <button onClick={() => setEditParticipant(null)}><X size={20} /></button>
              </div>
              <form onSubmit={saveEdit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="שם פרטי" value={editParticipant.first_name} onChange={v => setEditParticipant({...editParticipant, first_name: v})} required />
                  <FormField label="שם משפחה" value={editParticipant.last_name} onChange={v => setEditParticipant({...editParticipant, last_name: v})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="מספר משתתף" value={editParticipant.bib_number || ''} onChange={v => setEditParticipant({...editParticipant, bib_number: v})} />
                  <FormField label="טלפון" value={editParticipant.phone} onChange={v => setEditParticipant({...editParticipant, phone: v})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label='דוא"ל' value={editParticipant.email} onChange={v => setEditParticipant({...editParticipant, email: v})} />
                  <FormField label="יישוב" value={editParticipant.city || ''} onChange={v => setEditParticipant({...editParticipant, city: v})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                    <select value={editParticipant.status} onChange={e => setEditParticipant({...editParticipant, status: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תשלום</label>
                    <select value={editParticipant.payment_status} onChange={e => setEditParticipant({...editParticipant, payment_status: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      {paymentOptions.map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}
                    </select>
                  </div>
                </div>
                <FormField label="הערות" value={editParticipant.notes || ''} onChange={v => setEditParticipant({...editParticipant, notes: v})} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditParticipant(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm">ביטול</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'שומר...' : 'שמירה'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    </div>
  );
}
