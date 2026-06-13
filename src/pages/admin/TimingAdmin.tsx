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

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1100, margin: '0 auto', paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  filtersBar: { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap' as const, gap: 10 },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  input: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui', width: 160 },
  tableWrap: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'right' as const, padding: '11px 14px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1.5px solid #f3f4f6' },
  td: { padding: '9px 14px', borderBottom: '1px solid #f9fafb', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 48, color: '#9ca3af', fontSize: 15 },
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 340, padding: 24 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: '#111827' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  timeInput: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 18, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', textAlign: 'center' as const, marginBottom: 16 },
  btnRow: { display: 'flex', gap: 10 },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  iconBtn: (color: string) => ({ background: 'none', border: 'none', cursor: 'pointer', color, padding: 3, display: 'flex', alignItems: 'center' }),
};

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

  const stationColors = ['#3b82f6', '#f97316', '#22c55e'];

  return (
    <div style={S.page}>
      <div style={S.title}>⏱️ עריכת זמנים</div>

      <div style={S.filtersBar}>
        <select style={S.select} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select style={S.select} value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
          <option value="">כל המקצים</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input
          style={S.input}
          type="text"
          placeholder="🔍 חיפוש שם / מספר..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {editRecord && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>
                {['🏊','🚴','🏃'][editRecord.station - 1]} תחנה {editRecord.station}
              </span>
              <button style={S.closeBtn} onClick={() => setEditRecord(null)}><X size={18} /></button>
            </div>
            <label style={S.label}>שעה (HH:MM)</label>
            <input
              type="time"
              value={editTime}
              onChange={e => setEditTime(e.target.value)}
              style={S.timeInput}
            />
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => setEditRecord(null)}>ביטול</button>
              <button style={{ ...S.btnPrimary, opacity: saving || !editTime ? 0.5 : 1 }} onClick={saveTime} disabled={saving || !editTime}>
                {saving ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.tableWrap}>
        <div style={S.tableScroll}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>מס'</th>
                <th style={S.th}>שם</th>
                <th style={S.th}>מקצה</th>
                <th style={{ ...S.th, color: stationColors[0] }}>🏊 שחייה</th>
                <th style={{ ...S.th, color: stationColors[1] }}>🚴 אופניים</th>
                <th style={{ ...S.th, color: stationColors[2] }}>🏃 ריצה</th>
                <th style={S.th}>סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.participant.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...S.td, fontFamily: 'monospace', color: '#6b7280', fontWeight: 600 }}>
                    {row.participant.bib_number || '—'}
                  </td>
                  <td style={{ ...S.td, fontWeight: 600, color: '#111827' }}>
                    {row.participant.first_name} {row.participant.last_name}
                  </td>
                  <td style={{ ...S.td, color: '#6b7280', fontSize: 12 }}>{row.race?.name || '—'}</td>
                  {([1,2,3] as const).map(station => {
                    const rec = station === 1 ? row.t1 : station === 2 ? row.t2 : row.t3;
                    const time = station === 1 ? row.swim : station === 2 ? row.bike : row.run;
                    const color = stationColors[station - 1];
                    return (
                      <td key={station} style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: rec ? color : '#d1d5db' }}>
                            {rec ? new Date(rec.recorded_at).toLocaleTimeString('he-IL') : '—'}
                          </span>
                          {time !== undefined && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>({formatTime(time)})</span>
                          )}
                          <button
                            style={S.iconBtn(rec ? color : '#9ca3af')}
                            onClick={() => openEdit(row.participant.id, station, rec)}
                            title={rec ? 'ערוך' : 'הוסף'}
                          >
                            {rec ? <Edit2 size={11} /> : <Plus size={11} />}
                          </button>
                          {rec && (
                            <button
                              style={S.iconBtn('#ef4444')}
                              onClick={() => deleteTime(rec)}
                              title="מחק"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 800, color: row.total ? '#111827' : '#d1d5db' }}>
                    {row.total ? formatTime(row.total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={S.empty}>אין נתונים</div>}
        </div>
      </div>
    </div>
  );
}
