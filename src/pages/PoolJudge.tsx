import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Race, Participant } from '../lib/types';
import toast from 'react-hot-toast';
import { Search, Check, Minus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POOL_LENGTH_METERS = 25;

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
    loadAll();
  }, [selectedRace]);

  async function loadAll() {
    const { data: parts } = await supabase
      .from('participants').select('*')
      .eq('event_id', selectedEvent).eq('race_id', selectedRace)
      .order('lane').order('bib_number');
    setParticipants(parts || []);

    const ids = (parts || []).map(p => p.id);
    if (!ids.length) { setLapCounts({}); setFinishedAt({}); return; }

    const [{ data: logs }, { data: timing }] = await Promise.all([
      supabase.from('pool_lap_logs').select('participant_id').in('participant_id', ids),
      supabase.from('timing_records').select('participant_id, recorded_at').in('participant_id', ids).eq('station', 1),
    ]);

    const counts: Record<string, number> = {};
    for (const log of logs || []) counts[log.participant_id] = (counts[log.participant_id] || 0) + 1;
    setLapCounts(counts);

    const finished: Record<string, string> = {};
    for (const t of timing || []) { if (t.participant_id) finished[t.participant_id] = t.recorded_at; }
    setFinishedAt(finished);
  }

  const race = useMemo(() => races.find(r => r.id === selectedRace), [races, selectedRace]);
  const requiredLaps = race ? requiredLapsFor(race) : 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return participants;
    const q = search.trim().toLowerCase();
    return participants.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.bib_number || '').includes(q)
    );
  }, [participants, search]);

  const lanes = useMemo(() => {
    const map: Record<number, Participant[]> = {};
    for (const p of filtered) {
      const lane = p.lane || 0;
      if (!map[lane]) map[lane] = [];
      map[lane].push(p);
    }
    return Object.entries(map)
      .map(([lane, parts]) => ({ lane: Number(lane), parts }))
      .sort((a, b) => a.lane - b.lane);
  }, [filtered]);

  async function addLap(p: Participant) {
    const current = lapCounts[p.id] || 0;
    if (current >= requiredLaps) return;
    const nextLap = current + 1;
    setLapCounts(prev => ({ ...prev, [p.id]: nextLap }));

    const { error } = await supabase.from('pool_lap_logs').insert({
      event_id: selectedEvent, participant_id: p.id,
      lap_number: nextLap, recorded_by: appUser?.email,
    });
    if (error) { setLapCounts(prev => ({ ...prev, [p.id]: current })); toast.error('שגיאה'); return; }

    if (nextLap >= requiredLaps && !finishedAt[p.id]) {
      const { data: ins, error: insErr } = await supabase
        .from('timing_records')
        .insert({ event_id: selectedEvent, participant_id: p.id, station: 1, recorded_by: appUser?.email })
        .select('recorded_at').single();
      if (!insErr) {
        setFinishedAt(prev => ({ ...prev, [p.id]: ins?.recorded_at || '' }));
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator(); osc.connect(ctx.destination);
          osc.frequency.value = 1320; osc.start(); setTimeout(() => osc.stop(), 200);
        } catch {}
        toast.success(`✅ ${p.first_name} סיים!`, { duration: 2500 });
      }
    }
  }

  async function undoLap(p: Participant) {
    const current = lapCounts[p.id] || 0;
    if (current === 0) return;
    if (!confirm(`לבטל הקפה של ${p.first_name}?`)) return;

    const { data: rows } = await supabase
      .from('pool_lap_logs').select('id, lap_number')
      .eq('participant_id', p.id).order('lap_number', { ascending: false }).limit(1);
    const row = rows?.[0];
    if (!row) return;

    const wasFinished = finishedAt[p.id];
    await supabase.from('pool_lap_logs').delete().eq('id', row.id);
    setLapCounts(prev => ({ ...prev, [p.id]: current - 1 }));

    if (wasFinished && current - 1 < requiredLaps) {
      await supabase.from('timing_records').delete().eq('participant_id', p.id).eq('station', 1);
      setFinishedAt(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    }
    toast.success('בוטל');
  }

  const myLane = appUser?.pool_lane;
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 20, fontWeight: 800 }}>🏊 שיפוט בריכה</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
              <LogOut size={15} /> יציאה
            </button>
          </div>
        </div>
        {myLane && <div style={{ textAlign: 'center', fontSize: 13, color: '#60a5fa' }}>מסלול {myLane} שלך</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
            style={{ flex: 1, minWidth: 140, background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 10px', color: 'white', fontSize: 14, outline: 'none' }}>
            <option value="">-- אירוע --</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)} disabled={!selectedEvent}
            style={{ flex: 1, minWidth: 140, background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 10px', color: 'white', fontSize: 14, outline: 'none' }}>
            <option value="">-- מקצה --</option>
            {races.map(r => <option key={r.id} value={r.id}>{r.name} ({requiredLapsFor(r)} הק')</option>)}
          </select>
        </div>

        {selectedRace && participants.length > 0 && (
          <div style={{ position: 'relative', marginTop: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש שם / מספר"
              style={{ width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 36px 8px 10px', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
        )}
      </div>

      {/* Lanes grid - horizontal scroll */}
      {selectedRace && (
        <div style={{ overflowX: 'auto', padding: '12px 8px' }}>
          <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
            {lanes.map(({ lane, parts }) => {
              const isMyLane = !myLane || myLane === lane;
              return (
                <div key={lane} style={{
                  width: 160,
                  background: '#1e293b',
                  borderRadius: 14,
                  border: isMyLane && myLane ? '2px solid #3b82f6' : '2px solid #334155',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {/* Lane header */}
                  <div style={{
                    background: isMyLane && myLane ? '#1e40af' : '#0f172a',
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                  }}>
                    🏊 מסלול {lane}
                    {isMyLane && myLane && (
                      <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 600, marginTop: 2 }}>המסלול שלי</div>
                    )}
                  </div>

                  {/* Swimmers */}
                  <div style={{ padding: 6 }}>
                    {parts.map(p => {
                      const count = lapCounts[p.id] || 0;
                      const done = count >= requiredLaps && requiredLaps > 0;
                      const canEdit = isMyLane;

                      return (
                        <div key={p.id} style={{
                          background: done ? '#064e3b' : '#0f172a',
                          border: done ? '1.5px solid #10b981' : '1.5px solid #334155',
                          borderRadius: 10,
                          padding: '8px 8px 6px',
                          marginBottom: 6,
                          opacity: canEdit ? 1 : 0.65,
                        }}>
                          {/* Bib + name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <div style={{
                              background: done ? '#10b981' : '#0ea5e9',
                              color: 'white', fontFamily: 'monospace', fontSize: 13, fontWeight: 800,
                              borderRadius: 6, padding: '2px 6px', flexShrink: 0,
                            }}>{p.bib_number || '—'}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden' }}>
                              {p.first_name}<br />{p.last_name}
                            </div>
                          </div>

                          {/* Lap counter */}
                          <div style={{ textAlign: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>{count}</span>
                            <span style={{ fontSize: 18, color: '#64748b', margin: '0 4px' }}>/</span>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{requiredLaps}</span>
                          </div>

                          {/* Buttons */}
                          {canEdit && !done && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => addLap(p)}
                                style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 20, fontWeight: 900, cursor: 'pointer' }}>
                                +
                              </button>
                              {count > 0 && (
                                <button onClick={() => undoLap(p)}
                                  style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 8, padding: '10px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                  <Minus size={16} />
                                </button>
                              )}
                            </div>
                          )}

                          {done && (
                            <div style={{ background: '#10b981', color: 'white', borderRadius: 8, padding: '6px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <Check size={13} /> סיים
                              {finishedAt[p.id] && (
                                <span style={{ fontSize: 11, opacity: 0.85 }}>
                                  {new Date(finishedAt[p.id]).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {lanes.length === 0 && (
              <div style={{ color: '#94a3b8', padding: 20, fontSize: 14 }}>
                {participants.length === 0 ? 'אין משתתפים במקצה' : 'לא נמצאו תוצאות'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
