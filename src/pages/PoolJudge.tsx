import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Race, Participant } from '../lib/types';
import toast from 'react-hot-toast';
import { Check, Minus, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POOL_LENGTH_METERS = 25;

function requiredLapsFor(race: Race): number {
  if (!race || !race.swim_distance) return 0;
  return Math.ceil(Number(race.swim_distance) / POOL_LENGTH_METERS);
}

export default function PoolJudge() {
  const { appUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lapCounts, setLapCounts] = useState<Record<string, number>>({});
  const [finishedAt, setFinishedAt] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');

  const myLane = appUser?.pool_lane;

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

  // My lane swimmers (if judge has assigned lane) or all participants
  const mySwimmers = useMemo(() => {
    if (!myLane) return participants;
    return participants.filter(p => p.lane === myLane);
  }, [participants, myLane]);

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

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ flex: 1 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center' }}>🏊 שיפוט בריכה</div>
            {myLane && <div style={{ textAlign: 'center', fontSize: 13, color: '#60a5fa', marginTop: 2 }}>מסלול {myLane}</div>}
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button onClick={() => navigate('/admin')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Home size={15} />
            </button>
            <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
              <LogOut size={15} /> יציאה
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
            style={{ flex: 1, background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 10px', color: 'white', fontSize: 14, outline: 'none' }}>
            <option value="">-- אירוע --</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)} disabled={!selectedEvent}
            style={{ flex: 1, background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 10px', color: 'white', fontSize: 14, outline: 'none' }}>
            <option value="">-- מקצה --</option>
            {races.map(r => <option key={r.id} value={r.id}>{r.name} ({requiredLapsFor(r)} הק')</option>)}
          </select>
        </div>
      </div>

      {/* Swimmers list */}
      <div style={{ padding: '12px 12px', maxWidth: 520, margin: '0 auto' }}>
        {selectedRace && mySwimmers.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginTop: 40 }}>אין שחיינים במסלול זה</div>
        )}

        {mySwimmers.map(p => {
          const count = lapCounts[p.id] || 0;
          const done = count >= requiredLaps && requiredLaps > 0;

          return (
            <div key={p.id} style={{
              background: done ? '#052e16' : '#1e293b',
              border: `2px solid ${done ? '#16a34a' : '#334155'}`,
              borderRadius: 18,
              padding: '14px 16px',
              marginBottom: 12,
            }}>
              {/* Name + bib row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  background: done ? '#16a34a' : '#0ea5e9',
                  color: 'white', fontFamily: 'monospace', fontSize: 20, fontWeight: 900,
                  borderRadius: 10, padding: '6px 14px', flexShrink: 0,
                }}>
                  {p.bib_number || '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{p.first_name} {p.last_name}</div>
                  {p.lane && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>מסלול {p.lane}</div>}
                </div>
                {done && <div style={{ background: '#16a34a', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>✓ סיים</div>}
              </div>

              {/* Lap counter */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 64, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 32, color: '#475569', margin: '0 8px' }}>/</span>
                <span style={{ fontSize: 40, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{requiredLaps}</span>
              </div>

              {/* Buttons */}
              {!done ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => addLap(p)} style={{
                    flex: 1, background: '#16a34a', color: 'white', border: 'none',
                    borderRadius: 14, padding: '18px 0', fontSize: 28, fontWeight: 900,
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
                    userSelect: 'none',
                  }}>+</button>
                  {count > 0 && (
                    <button onClick={() => undoLap(p)} style={{
                      background: '#7f1d1d', color: '#fca5a5', border: 'none',
                      borderRadius: 14, padding: '18px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <Minus size={22} />
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ background: '#16a34a', color: 'white', borderRadius: 12, padding: '12px 0', textAlign: 'center', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={16} />
                  סיים בשעה {finishedAt[p.id] ? new Date(finishedAt[p.id]).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
