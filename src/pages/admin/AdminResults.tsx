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

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-500" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">תוצאות ודירוגים</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <select value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); setSelectedRace(''); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">כל המקצים</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">כל המינים</option>
          <option value="male">גברים</option>
          <option value="female">נשים</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">כללי</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מקצה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מין</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מס'</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מקצה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">🏊</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">🚴</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">🏃</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">סה"כ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r, i) => (
                <tr key={r.participant.id} className={i < 3 && r.overall_rank ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-bold text-lg">
                    {r.overall_rank === 1 ? '🥇' : r.overall_rank === 2 ? '🥈' : r.overall_rank === 3 ? '🥉' : r.overall_rank || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.race_rank || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.gender_rank || '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{r.participant.bib_number || '—'}</td>
                  <td className="px-4 py-3 font-medium">{r.participant.first_name} {r.participant.last_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.race?.name}</td>
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">{r.swim ? formatTime(r.swim) : '—'}</td>
                  <td className="px-4 py-3 font-mono text-orange-600 text-xs">{r.bike ? formatTime(r.bike) : '—'}</td>
                  <td className="px-4 py-3 font-mono text-green-600 text-xs">{r.run ? formatTime(r.run) : '—'}</td>
                  <td className="px-4 py-3 font-mono font-bold">{r.total ? formatTime(r.total) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.participant.status === 'finished' ? 'bg-green-100 text-green-700' :
                      r.participant.status === 'dnf' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{statusLabel(r.participant.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.participant.status === 'finished' && (
                      <button onClick={() => generateCertificatePDF(r)} title="הורד תעודה"
                        className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">
                        🎓 תעודה
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">אין תוצאות</div>}
        </div>
      </div>
    </div>
  );
}
