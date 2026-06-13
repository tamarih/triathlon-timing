import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event, Race, Participant } from '../lib/types';
import { formatTime, timeDiffSeconds, statusLabel, genderLabel } from '../lib/utils';
import { Search, Trophy } from 'lucide-react';

interface Result {
  participant: Participant;
  race: Race;
  swim_time?: number;
  bike_time?: number;
  run_time?: number;
  total_time?: number;
  rank?: number;
  gender_rank?: number;
}

export default function Results() {
  const [params] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(params.get('event') || '');
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open','closed','finished']).order('date').then(({ data }) => {
      setEvents(data || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).then(({ data }) => setRaces(data || []));
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return;
    loadResults();

    const sub = supabase.channel('results-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timing_records' }, () => loadResults())
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [selectedEvent, selectedRace]);

  async function loadResults() {
    setLoading(true);
    let pQuery = supabase.from('participants').select('*').eq('event_id', selectedEvent).neq('status', 'dns');
    if (selectedRace) pQuery = pQuery.eq('race_id', selectedRace);
    const { data: participants } = await pQuery;

    const { data: timings } = await supabase.from('timing_records').select('*').eq('event_id', selectedEvent);
    const racesData = races.length ? races : (await supabase.from('races').select('*').eq('event_id', selectedEvent)).data || [];

    const computed: Result[] = (participants || []).map(p => {
      const race = racesData.find(r => r.id === p.race_id);
      if (!race) return { participant: p, race: race! };
      const gunStr = `1970-01-01T${race.gun_time}`;
      const t1 = timings?.find(t => t.participant_id === p.id && t.station === 1);
      const t2 = timings?.find(t => t.participant_id === p.id && t.station === 2);
      const t3 = timings?.find(t => t.participant_id === p.id && t.station === 3);
      let swim_time, bike_time, run_time, total_time;
      if (t1) swim_time = timeDiffSeconds(gunStr, t1.recorded_at);
      if (t1 && t2) bike_time = timeDiffSeconds(t1.recorded_at, t2.recorded_at);
      if (t2 && t3) run_time = timeDiffSeconds(t2.recorded_at, t3.recorded_at);
      if (t3) total_time = timeDiffSeconds(gunStr, t3.recorded_at);
      return { participant: p, race, swim_time, bike_time, run_time, total_time };
    });

    // Sort by total_time (finished first, DNS/DNF last)
    computed.sort((a, b) => {
      if (a.total_time && b.total_time) return a.total_time - b.total_time;
      if (a.total_time) return -1;
      if (b.total_time) return 1;
      return 0;
    });

    // Rank
    let rank = 1, mRank = 1, fRank = 1;
    computed.forEach(r => {
      if (r.total_time) {
        r.rank = rank++;
        if (r.participant.gender === 'male') r.gender_rank = mRank++;
        else r.gender_rank = fRank++;
      }
    });

    setResults(computed);
    setLoading(false);
  }

  const filtered = results.filter(r => {
    const name = `${r.participant.first_name} ${r.participant.last_name}`.toLowerCase();
    const bib = r.participant.bib_number || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || bib.includes(search);
    const matchGender = !genderFilter || r.participant.gender === genderFilter;
    return matchSearch && matchGender;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-yellow-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">תוצאות חיות</h1>
          <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-col sm:flex-row gap-3">
          <select
            value={selectedEvent}
            onChange={e => { setSelectedEvent(e.target.value); setSelectedRace(''); }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- בחרו אירוע --</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          {races.length > 0 && (
            <select
              value={selectedRace}
              onChange={e => setSelectedRace(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">כל המקצים</option>
              {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">כל המינים</option>
            <option value="male">גברים</option>
            <option value="female">נשים</option>
          </select>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש שם / מספר..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-48 border border-gray-300 rounded-lg pr-8 pl-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {!selectedEvent ? (
          <div className="text-center py-16 text-gray-500">בחרו אירוע לצפייה בתוצאות</div>
        ) : loading ? (
          <div className="text-center py-16 text-gray-500">טוען תוצאות...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">אין תוצאות</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">מקום</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">מס'</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">מקצה</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">שחייה</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">אופניים</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">ריצה</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">סה"כ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r, i) => (
                    <tr key={r.participant.id} className={i < 3 && r.rank ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-bold">
                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{r.participant.bib_number || '—'}</td>
                      <td className="px-4 py-3 font-medium">
                        {r.participant.first_name} {r.participant.last_name}
                        <div className="text-xs text-gray-400">{genderLabel(r.participant.gender)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.race?.name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 hidden md:table-cell">{formatTime(r.swim_time || 0)}</td>
                      <td className="px-4 py-3 font-mono text-orange-600 hidden md:table-cell">{formatTime(r.bike_time || 0)}</td>
                      <td className="px-4 py-3 font-mono text-green-600 hidden md:table-cell">{formatTime(r.run_time || 0)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{r.total_time ? formatTime(r.total_time) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.participant.status === 'finished' ? 'bg-green-100 text-green-700' :
                          r.participant.status === 'started' ? 'bg-blue-100 text-blue-700' :
                          r.participant.status === 'dnf' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {statusLabel(r.participant.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
