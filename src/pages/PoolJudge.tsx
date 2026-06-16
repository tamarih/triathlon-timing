import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Race, Participant } from '../lib/types';
import toast from 'react-hot-toast';
import { Minus, Search, Check } from 'lucide-react';

const POOL_LENGTH_METERS = 25;

const S = {
  page: { minHeight: '100vh', background: '#0f172a', color: 'white', padding: 12, direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif' },
  inner: { maxWidth: 560, margin: '0 auto' },
  header: { textAlign: 'center' as const, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#94a3b8' },
  card: { background: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 14 },
  label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  select: { width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 10, padding: '10px 12px', color: 'white', fontSize: 15, outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' as const },
  searchWrap: { position: 'relative' as const, marginBottom: 12 },
  search: { width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 10, padding: '10px 36px 10px 12px', color: 'white', fontSize: 15, outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' as const },
  searchIcon: { position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
  partCard: (done: boolean): React.CSSProperties => ({
    background: done ? '#064e3b' : '#1e293b',
    border: done ? '2px solid #10b981' : '2px solid transparent',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    transition: 'background 0.2s, border 0.2s',
  }),
  partTopRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  bibBadge: { background: '#0ea5e9', color: 'white', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, borderRadius: 10, padding: '8px 12px', minWidth: 60, textAlign: 'center' as const },
  bibBadgeDone: { background: '#10b981', color: 'white', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, borderRadius: 10, padding: '8px 12px', minWidth: 60, textAlign: 'center' as const },
  partName: { fontSize: 17, fontWeight: 700, flex: 1 },
  doneBanner: { background: '#10b981', color: 'white', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  countRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  countMain: { fontSize: 56, fontWeight: 900, lineHeight: 1, fontFamily: 'monospace' },
  countSlash: { fontSize: 36, color: '#64748b', fontWeight: 800 },
  countTotal: { fontSize: 36, fontWeight: 800, color: '#94a3b8', fontFamily: 'monospace' },
  btnRow: { display: 'flex', gap: 10 },
  bigPlus: (done: boolean): React.CSSProperties => ({
    flex: 1,
    background: done ? '#374151' : '#16a34a',
    color: done ? '#6b7280' : 'white',
    border: 'none',
    borderRadius: 14,
    padding: '20px 0',
    fontSize: 26,
    fontWeight: 900,
    cursor: done ? 'not-allowed' : 'pointer',
    boxShadow: done ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
    userSelect: 'none' as const,
  }),
  undoBtn: { background: '#7f1d1d', color: '#fecaca', border: 'none', borderRadius: 14, padding: '20px 18px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  finishBtn: { width: '100%', background: '#10b981', color: 'white', border: 'none', borderRadius: 14, padding: '14px 0', fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  finishDone: { width: '100%', background: '#065f46', color: 'white', border: 'none', borderRadius: 14, padding: '14px 0', fontSize: 15, fontWeight: 700, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyHint: { textAlign: 'center' as const, color: '#94a3b8', fontSize: 14, padding: 20 },
};

function requiredLapsFor(race: Race): number {
  if (!race || !race.swim_distance) return 0;
  return Math.ceil(Number(race.swim_distance) / POOL_LENGTH_METERS);
}

export default function PoolJudge() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lapCounts, setLapCounts] = useState<Record<string, number>>({});
  const [finishedAt, setFinishedAt] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open', 'closed']).order('date').then(({ data }) => {
      setEvents(data || []);
      if (data && data.length === 1) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) { setRaces([]); setSelectedRace(''); return; }
    supabase.from('races').select('*').eq('event_id', selectedEvent).gt('swim_distance', 0).order('name').then(({ data }) => {
      setRaces(data || []);
      if (data?.length === 1) setSelectedRace(data[0].id);
    });
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedRace) { setParticipants([]); return; }
    loadParticipantsAndLaps();
  }, [selectedRace]);

  async function loadParticipantsAndLaps() {
    const { data: parts } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', selectedEvent)
      .eq('race_id', selectedRace)
      .order('lane')
      .order('bib_number');
    setParticipants(parts || []);

    const partIds = (parts || []).map(p => p.id);
    if (partIds.length === 0) { setLapCounts({}); setFinishedAt({}); return; }

    const [{ data: logs }, { data: timing }] = await Promise.all([
      supabase.from('pool_lap_logs').select('participant_id').in('participant_id', partIds),
      supabase.from('timing_records').select('participant_id, recorded_at').in('participant_id', partIds).eq('station', 1),
    ]);

    const counts: Record<string, number> = {};
    for (const log of logs || []) {
      counts[log.participant_id] = (counts[log.participant_id] || 0) + 1;
    }
    setLapCounts(counts);

    const finished: Record<string, string> = {};
    for (const t of timing || []) {
      if (t.participant_id) finished[t.participant_id] = t.recorded_at;
    }
    setFinishedAt(finished);
  }

  const race = useMemo(() => races.find(r => r.id === selectedRace), [races, selectedRace]);
  const requiredLaps = race ? requiredLapsFor(race) : 0;

  const filteredParticipants = useMemo(() => {
    if (!search.trim()) return participants;
    const q = search.trim().toLowerCase();
    return participants.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.bib_number || '').includes(q)
    );
  }, [participants, search]);

  const lanes = useMemo(() => {
    const map: Record<number, Participant[]> = {};
    for (const p of filteredParticipants) {
      const lane = p.lane || 0;
      if (!map[lane]) map[lane] = [];
      map[lane].push(p);
    }
    return Object.entries(map).map(([lane, parts]) => ({ lane: Number(lane), parts })).sort((a, b) => a.lane - b.lane);
  }, [filteredParticipants]);

  async function addLap(p: Participant) {
    const current = lapCounts[p.id] || 0;
    if (current >= requiredLaps) return;
    const nextLap = current + 1;

    // Optimistic update
    setLapCounts(prev => ({ ...prev, [p.id]: nextLap }));

    const { error } = await supabase.from('pool_lap_logs').insert({
      event_id: selectedEvent,
      participant_id: p.id,
      lap_number: nextLap,
      recorded_by: appUser?.email,
    });
    if (error) {
      setLapCounts(prev => ({ ...prev, [p.id]: current }));
      toast.error('שגיאה: ' + error.message);
      return;
    }

    if (nextLap >= requiredLaps && !finishedAt[p.id]) {
      // Auto-record swim finish (timing_records station 1)
      const { data: ins, error: insErr } = await supabase
        .from('timing_records')
        .insert({
          event_id: selectedEvent,
          participant_id: p.id,
          station: 1,
          recorded_by: appUser?.email,
        })
        .select('recorded_at')
        .single();

      if (!insErr) {
        setFinishedAt(prev => ({ ...prev, [p.id]: ins?.recorded_at || new Date().toISOString() }));
        if (p.status === 'registered') {
          await supabase.from('participants').update({ status: 'started' }).eq('id', p.id);
        }
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.frequency.value = 1320;
          osc.start();
          setTimeout(() => osc.stop(), 200);
        } catch {}
        toast.success(`✅ ${p.first_name} סיים שחייה!`, { duration: 2500 });
      }
    }
  }

  async function undoLap(p: Participant) {
    const current = lapCounts[p.id] || 0;
    if (current === 0) return;
    if (!confirm(`לבטל הקפה אחרונה של ${p.first_name} ${p.last_name}?`)) return;

    // Get most recent lap log row
    const { data: rows } = await supabase
      .from('pool_lap_logs')
      .select('id, lap_number')
      .eq('participant_id', p.id)
      .order('lap_number', { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return;

    const wasFinished = finishedAt[p.id];

    await supabase.from('pool_lap_logs').delete().eq('id', row.id);
    setLapCounts(prev => ({ ...prev, [p.id]: current - 1 }));

    // If they had been marked finished and now we're below required, remove the swim-finish timing record
    if (wasFinished && current - 1 < requiredLaps) {
      await supabase.from('timing_records').delete().eq('participant_id', p.id).eq('station', 1);
      setFinishedAt(prev => {
        const next = { ...prev }; delete next[p.id]; return next;
      });
    }

    toast.success('בוטל');
  }

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.header}>
          <div style={S.headerTitle}>🏊 שיפוט בריכה</div>
          <div style={S.headerSub}>
            {appUser?.pool_lane ? `מסלול ${appUser.pool_lane}` : 'ספירת הקפות לכל משתתף'}
          </div>
        </div>

        <div style={S.card}>
          <label style={S.label}>אירוע</label>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={{ ...S.select, marginBottom: 12 }}>
            <option value="">-- בחרו אירוע --</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>

          <label style={S.label}>מקצה</label>
          <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)} style={S.select} disabled={!selectedEvent}>
            <option value="">-- בחרו מקצה --</option>
            {races.map(r => <option key={r.id} value={r.id}>{r.name} ({requiredLapsFor(r)} הקפות)</option>)}
          </select>
        </div>

        {selectedRace && participants.length > 0 && (
          <div style={S.searchWrap}>
            <input style={S.search} placeholder="חיפוש לפי מספר / שם" value={search} onChange={e => setSearch(e.target.value)} />
            <Search size={16} style={S.searchIcon} />
          </div>
        )}

        {selectedRace && filteredParticipants.length === 0 && (
          <div style={S.emptyHint}>
            {participants.length === 0 ? 'אין משתתפים במקצה זה' : 'לא נמצאו תוצאות'}
          </div>
        )}

        {lanes.map(({ lane, parts }) => {
          const isMyLane = !appUser?.pool_lane || appUser.pool_lane === lane;
          return (
            <div key={lane} style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                padding: '8px 14px', borderRadius: 10,
                background: isMyLane ? '#1e40af' : '#1e293b',
                border: isMyLane ? '2px solid #60a5fa' : '2px solid #334155',
              }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>🏊 מסלול {lane}</span>
                {isMyLane && appUser?.pool_lane && <span style={{ fontSize: 12, background: '#60a5fa', color: '#1e3a8a', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>המסלול שלי</span>}
              </div>

              {parts.map(p => {
                const count = lapCounts[p.id] || 0;
                const done = count >= requiredLaps && requiredLaps > 0;
                const finishTime = finishedAt[p.id];
                const canEdit = isMyLane;
                return (
                  <div key={p.id} style={{ ...S.partCard(done), opacity: canEdit ? 1 : 0.6 }}>
                    <div style={S.partTopRow}>
                      <div style={done ? S.bibBadgeDone : S.bibBadge}>{p.bib_number || '—'}</div>
                      <div style={S.partName}>{p.first_name} {p.last_name}</div>
                      {done && <div style={S.doneBanner}>✓ סיים</div>}
                    </div>

                    <div style={S.countRow}>
                      <span style={S.countMain}>{count}</span>
                      <span style={S.countSlash}>/</span>
                      <span style={S.countTotal}>{requiredLaps}</span>
                    </div>

                    {canEdit && (
                      <div style={S.btnRow}>
                        <button style={S.bigPlus(done)} onClick={() => addLap(p)} disabled={done}>
                          {done ? '✓ הושלם' : '+ בריכה'}
                        </button>
                        {count > 0 && (
                          <button style={S.undoBtn} onClick={() => undoLap(p)} title="ביטול">
                            <Minus size={20} />
                          </button>
                        )}
                      </div>
                    )}

                    {done && finishTime && (
                      <div style={S.finishDone}>
                        <Check size={16} /> זמן סיום: {new Date(finishTime).toLocaleTimeString('he-IL')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
