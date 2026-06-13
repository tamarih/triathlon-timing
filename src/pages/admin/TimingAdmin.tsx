import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Participant, Event, Race, TimingRecord } from '../../lib/types';
import { formatTime, timeDiffSeconds } from '../../lib/utils';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface TimingRow {
  participant: Participant;
  race: Race | undefined;
  t1?: TimingRecord;
  t2?: TimingRecord;
  t3?: TimingRecord;
  swim?: number;
  bike?: number;
  run?: number;
  total?: number;
}

export default function TimingAdmin() {
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [rows, setRows] = useState<TimingRow[]>([]);
  const [search, setSearch] = useState('');
  const [editRecord, setEditRecord] = useState<{ participantId: string; station: 1|2|3; existing?: TimingRecord } | null>(null);
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).then(({ data }) => setRaces(data || []));
    loadData();
  }, [selectedEvent]);

  async function loadData() {
    if (!selectedEvent) return;
    const [{ data: parts }, { data: timings }] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', selectedEvent).order('bib_number'),
      supabase.from('timing_records').select('*').eq('event_id', selectedEvent),
    ]);
    const racesData = races.length ? races : (await supabase.from('races').select('*').eq('event_id', selectedEvent)).data || [];

    const computed: TimingRow[] = (parts || []).map(p => {
      const race = racesData.find(r => r.id === p.race_id);
      const t1 = timings?.find(t => t.participant_id === p.id && t.station === 1);
      const t2 = timings?.find(t => t.participant_id === p.id && t.station === 2);
      const t3 = timings?.find(t => t.participant_id === p.id && t.station === 3);
      let swim, bike, run, total;
      if (race && t1) swim = timeDiffSeconds(`1970-01-01T${race.gun_time}`, t1.recorded_at);
      if (t1 && t2) bike = timeDiffSeconds(t1.recorded_at, t2.recorded_at);
      if (t2 && t3) run = timeDiffSeconds(t2.recorded_at, t3.recorded_at);
      if (race && t3) total = timeDiffSeconds(`1970-01-01T${race.gun_time}`, t3.recorded_at);
      return { participant: p, race, t1, t2, t3, swim, bike, run, total };
    });
    setRows(computed);
  }

  async function saveTime() {
    if (!editRecord || !editTime) return;
    setSaving(true);
    try {
      const dt = new Date(`1970-01-01T${editTime}:00`).toISOString();
      if (editRecord.existing) {
        await supabase.from('timing_records').update({ recorded_at: dt }).eq('id', editRecord.existing.id);
      } else {
        await supabase.from('timing_records').insert({
          event_id: selectedEvent,
          participant_id: editRecord.participantId,
          station: editRecord.station,
          recorded_at: dt,
          recorded_by: 'admin-manual',
        });
      }
      toast.success('זמן עודכן');
      setEditRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTime(record: TimingRecord) {
    if (!confirm('למחוק זמן זה?')) return;
    await supabase.from('timing_records').delete().eq('id', record.id);
    toast.success('זמן נמחק');
    loadData();
  }

  function openEdit(participantId: string, station: 1|2|3, existing?: TimingRecord) {
    setEditRecord({ participantId, station, existing });
    setEditTime(existing ? new Date(existing.recorded_at).toTimeString().slice(0, 5) : '');
  }

  const filtered = rows.filter(r => {
    const name = `${r.participant.first_name} ${r.participant.last_name}`.toLowerCase();
    const bib = r.participant.bib_number || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || bib.includes(search);
    const matchRace = !selectedRace || r.participant.race_id === selectedRace;
    return matchSearch && matchRace;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">עריכת זמנים</h1>

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
        <div className="relative">
          <input type="text" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-40" />
        </div>
      </div>

      {/* Edit modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">עריכת זמן - תחנה {editRecord.station}</h3>
              <button onClick={() => setEditRecord(null)}><X size={18} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">שעה (HH:MM)</label>
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditRecord(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm">ביטול</button>
              <button onClick={saveTime} disabled={saving || !editTime} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מס'</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מקצה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  🏊 שחייה
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">🚴 אופניים</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">🏃 ריצה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">סה"כ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(row => (
                <tr key={row.participant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">{row.participant.bib_number || '—'}</td>
                  <td className="px-4 py-3 font-medium">{row.participant.first_name} {row.participant.last_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.race?.name}</td>
                  {([1,2,3] as const).map(station => {
                    const rec = station === 1 ? row.t1 : station === 2 ? row.t2 : row.t3;
                    const time = station === 1 ? row.swim : station === 2 ? row.bike : row.run;
                    return (
                      <td key={station} className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className={`font-mono text-xs ${rec ? 'text-blue-600' : 'text-gray-300'}`}>
                            {rec ? new Date(rec.recorded_at).toLocaleTimeString('he-IL') : '—'}
                          </span>
                          {time !== undefined && <span className="text-xs text-gray-400">({formatTime(time)})</span>}
                          <button onClick={() => openEdit(row.participant.id, station, rec)}
                            className="p-0.5 text-gray-300 hover:text-blue-500 mr-1">
                            {rec ? <Edit2 size={11} /> : <Plus size={11} />}
                          </button>
                          {rec && (
                            <button onClick={() => deleteTime(rec)} className="p-0.5 text-gray-300 hover:text-red-500">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">
                    {row.total ? formatTime(row.total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">אין נתונים</div>}
        </div>
      </div>
    </div>
  );
}
