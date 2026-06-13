import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Race, Participant } from '../../lib/types';
import { formatTime, timeDiffSeconds, statusLabel } from '../../lib/utils';
import { Trophy } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface RankedResult {
  participant: Participant;
  race: Race | undefined;
  swim?: number; bike?: number; run?: number; total?: number;
  overall_rank?: number; gender_rank?: number; race_rank?: number;
}

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1100, margin: '0 auto', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  filtersBar: { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap' as const, gap: 10 },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  tableWrap: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'right' as const, padding: '11px 14px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1.5px solid #f3f4f6' },
  tdBase: { padding: '10px 14px', borderBottom: '1px solid #f9fafb' },
  empty: { textAlign: 'center' as const, padding: 48, color: '#9ca3af', fontSize: 15 },
};

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    finished: { bg: '#dcfce7', color: '#15803d' },
    dnf: { bg: '#fee2e2', color: '#dc2626' },
    started: { bg: '#dbeafe', color: '#1d4ed8' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return { ...s, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 };
};

export default function AdminResults() {
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [results, setResults] = useState<RankedResult[]>([]);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).then(({ data }) => setRaces(data || []));
    loadResults();
  }, [selectedEvent]);

  async function loadResults() {
    if (!selectedEvent) return;
    const [{ data: parts }, { data: timings }, { data: racesData }] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', selectedEvent).neq('status', 'dns'),
      supabase.from('timing_records').select('*').eq('event_id', selectedEvent),
      supabase.from('races').select('*').eq('event_id', selectedEvent),
    ]);

    const raceList = racesData || [];
    const computed: RankedResult[] = (parts || []).map(p => {
      const race = raceList.find(r => r.id === p.race_id);
      const gunStr = race ? `1970-01-01T${race.gun_time}` : '';
      const t1 = timings?.find(t => t.participant_id === p.id && t.station === 1);
      const t2 = timings?.find(t => t.participant_id === p.id && t.station === 2);
      const t3 = timings?.find(t => t.participant_id === p.id && t.station === 3);
      const swim = t1 && gunStr ? timeDiffSeconds(gunStr, t1.recorded_at) : undefined;
      const bike = t1 && t2 ? timeDiffSeconds(t1.recorded_at, t2.recorded_at) : undefined;
      const run = t2 && t3 ? timeDiffSeconds(t2.recorded_at, t3.recorded_at) : undefined;
      const total = t3 && gunStr ? timeDiffSeconds(gunStr, t3.recorded_at) : undefined;
      return { participant: p, race, swim, bike, run, total };
    });

    computed.sort((a, b) => {
      if (a.total !== undefined && b.total !== undefined) return a.total - b.total;
      if (a.total !== undefined) return -1;
      if (b.total !== undefined) return 1;
      return 0;
    });

    let rank = 1, mRank = 1, fRank = 1;
    const raceRanks: Record<string, number> = {};
    computed.forEach(r => {
      if (r.total !== undefined) {
        r.overall_rank = rank++;
        r.gender_rank = r.participant.gender === 'male' ? mRank++ : fRank++;
        const key = r.participant.race_id;
        r.race_rank = (raceRanks[key] || 0) + 1;
        raceRanks[key] = r.race_rank;
      }
    });

    setResults(computed);
  }

  async function generateCertificatePDF(result: RankedResult) {
    const doc = new jsPDF();
    // @ts-ignore
    void autoTable;
    const event = events.find(e => e.id === selectedEvent);
    doc.setFontSize(28); doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF COMPLETION', 105, 50, { align: 'center' });
    doc.setFontSize(16); doc.setFont('helvetica', 'normal');
    doc.text('This certifies that', 105, 70, { align: 'center' });
    doc.setFontSize(24); doc.setFont('helvetica', 'bold');
    doc.text(`${result.participant.first_name} ${result.participant.last_name}`, 105, 88, { align: 'center' });
    doc.setFontSize(14); doc.setFont('helvetica', 'normal');
    doc.text(`has successfully completed the ${event?.name || 'Triathlon'}`, 105, 104, { align: 'center' });
    doc.text(`Race: ${result.race?.name || ''}`, 105, 116, { align: 'center' });
    if (result.total) doc.text(`Time: ${formatTime(result.total)}`, 105, 128, { align: 'center' });
    if (result.overall_rank) doc.text(`Overall Place: ${result.overall_rank}`, 105, 140, { align: 'center' });
    if (result.race_rank) doc.text(`Race Place: ${result.race_rank}`, 105, 152, { align: 'center' });
    doc.text(event?.date || '', 105, 170, { align: 'center' });
    doc.save(`certificate_${result.participant.bib_number || result.participant.first_name}.pdf`);
    toast.success('תעודה הורדה');
  }

  const filtered = results.filter(r => {
    const matchRace = !selectedRace || r.participant.race_id === selectedRace;
    const matchGender = !genderFilter || r.participant.gender === genderFilter;
    return matchRace && matchGender;
  });

  const rankIcon = (rank?: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? String(rank) : '—';

  return (
    <div style={S.page}>
      <div style={S.header}>
        <Trophy size={22} color="#eab308" />
        <span style={S.title}>תוצאות ודירוגים</span>
        <span style={{ marginRight: 'auto', fontSize: 13, color: '#6b7280' }}>{filtered.length} משתתפים</span>
      </div>

      <div style={S.filtersBar}>
        <select style={S.select} value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); setSelectedRace(''); }}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select style={S.select} value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
          <option value="">כל המקצים</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select style={S.select} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
          <option value="">כל המינים</option>
          <option value="male">גברים</option>
          <option value="female">נשים</option>
        </select>
      </div>

      <div style={S.tableWrap}>
        <div style={S.tableScroll}>
          <table style={S.table}>
            <thead>
              <tr>
                {['כללי','מקצה','מין','מס\'','שם','קטגוריה','🏊 שחייה','🚴 אופניים','🏃 ריצה','סה"כ','סטטוס',''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isPodium = (r.overall_rank || 0) <= 3 && r.overall_rank;
                return (
                  <tr key={r.participant.id} style={{ background: isPodium ? '#fefce8' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ ...S.tdBase, fontWeight: 800, fontSize: 16 }}>{rankIcon(r.overall_rank)}</td>
                    <td style={{ ...S.tdBase, color: '#6b7280' }}>{r.race_rank || '—'}</td>
                    <td style={{ ...S.tdBase, color: '#6b7280' }}>{r.gender_rank || '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#6b7280' }}>{r.participant.bib_number || '—'}</td>
                    <td style={{ ...S.tdBase, fontWeight: 600, color: '#111827' }}>{r.participant.first_name} {r.participant.last_name}</td>
                    <td style={{ ...S.tdBase, color: '#6b7280', fontSize: 12 }}>{r.race?.name}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#3b82f6', fontSize: 12 }}>{r.swim ? formatTime(r.swim) : '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#f97316', fontSize: 12 }}>{r.bike ? formatTime(r.bike) : '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#22c55e', fontSize: 12 }}>{r.run ? formatTime(r.run) : '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', fontWeight: 800, color: '#111827' }}>{r.total ? formatTime(r.total) : '—'}</td>
                    <td style={S.tdBase}>
                      <span style={statusBadge(r.participant.status)}>{statusLabel(r.participant.status)}</span>
                    </td>
                    <td style={S.tdBase}>
                      {r.participant.status === 'finished' && (
                        <button
                          onClick={() => generateCertificatePDF(r)}
                          style={{ fontSize: 12, background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'system-ui' }}
                        >
                          🎓 תעודה
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={S.empty}>אין תוצאות</div>}
        </div>
      </div>
    </div>
  );
}
