import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [lastTap, setLastTap] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Clear cooldowns when they expire
  useEffect(() => {
    const active = Object.entries(lastTap).filter(([, t]) => Date.now() - t < 7000);
    if (active.length === 0) return;
    const timers = active.map(([id, t]) => {
      const remaining = 7000 - (Date.now() - t);
      return setTimeout(() => {
        setLastTap(prev => { const next = { ...prev }; delete next[id]; return next; });
      }, remaining + 50);
    });
    return () => timers.forEach(clearTimeout);
  }, [lastTap]);

  const myLanes: number[] = (appUser as any)?.pool_lanes?.length
    ? (appUser as any).pool_lanes
    : appUser?.pool_lane ? [appUser.pool_lane] : [];

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

    // Subscribe to race start broadcasts
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`race-start:${selectedRace}`)
      .on('broadcast', { event: 'start' }, () => runCountdown())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
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

  // Filter to assigned lanes, grouped by lane, sorted
  const mySwimmers = useMemo(() => {
    if (!myLanes.length) return participants;
    return participants.filter(p => p.lane && myLanes.includes(p.lane));
  }, [participants, myLanes]);

  async function addLap(p: Participant) {
    const now = Date.now();
    if (lastTap[p.id] && now - lastTap[p.id] < 7000) {
      const remaining = Math.ceil((7000 - (now - lastTap[p.id])) / 1000);
      toast.error(`המתן עוד ${remaining} שניות`, { id: p.id, duration: 1500 });
      return;
    }
    setLastTap(prev => ({ ...prev, [p.id]: now }));
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

  function beep(freq: number, duration: number) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.start();
      setTimeout(() => osc.stop(), duration);
    } catch {}
  }

  function runCountdown() {
    setCountdown(3);
    let n = 3;
    beep(880, 150);
    const iv = setInterval(() => {
      n--;
      if (n > 0) {
        setCountdown(n);
        beep(880, 150);
      } else {
        setCountdown(0);
        beep(1320, 600);
        setTimeout(() => setCountdown(null), 2000);
        clearInterval(iv);
      }
    }, 1000);
  }

  function startCountdown() {
    // Broadcast to all judges, then run locally
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'start', payload: {} });
    }
    runCountdown();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ flex: 1 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center' }}>🏊 שיפוט בריכה</div>
            {myLanes.length > 0 && <div style={{ textAlign: 'center', fontSize: 13, color: '#60a5fa', marginTop: 2 }}>מסלולים: {myLanes.join(', ')}</div>}
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

        <div style={{ display: 'flex', gap: 8, marginBottom: appUser?.role === 'admin' ? 8 : 0 }}>
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

        {appUser?.role === 'admin' && (
          <button onClick={startCountdown} disabled={!selectedRace || countdown !== null}
            style={{
              width: '100%', border: 'none', borderRadius: 10, padding: '13px 0',
              fontSize: 18, fontWeight: 900, letterSpacing: 1, cursor: !selectedRace || countdown !== null ? 'not-allowed' : 'pointer',
              background: !selectedRace ? '#374151' : countdown !== null ? '#374151' : 'linear-gradient(135deg,#dc2626,#f97316)',
              color: !selectedRace ? '#6b7280' : 'white',
            }}>
            🏁 הזנק!
          </button>
        )}
      </div>

      {/* Swimmers — one column per lane when multiple lanes */}
      {/* Countdown overlay */}
      {countdown !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: countdown === 0 ? 'rgba(22,163,74,0.95)' : 'rgba(15,23,42,0.95)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s',
        }}>
          {countdown > 0 ? (
            <>
              <div style={{ fontSize: 180, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1, color: countdown === 1 ? '#f97316' : 'white' }}>
                {countdown}
              </div>
              <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>התכוננו...</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 72, fontWeight: 900, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>
                🏁 צאו לדרך!
              </div>
            </>
          )}
        </div>
      )}

      {selectedRace && mySwimmers.length === 0 && (
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginTop: 40 }}>אין שחיינים במסלולים המוגדרים</div>
      )}

      {selectedRace && mySwimmers.length > 0 && (() => {
        // Group by lane
        const grouped: Record<number, typeof mySwimmers> = {};
        for (const p of mySwimmers) {
          const l = p.lane || 0;
          if (!grouped[l]) grouped[l] = [];
          grouped[l].push(p);
        }
        const laneNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);
        const numLanes = laneNums.length;
        const maxPerLane = Math.max(...laneNums.map(l => grouped[l].length));
        // Font/size scaling based on number of rows
        const compact = maxPerLane > 4 || (numLanes > 1 && maxPerLane > 3);
        const tiny = maxPerLane > 6;

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: numLanes > 1 ? `repeat(${numLanes}, 1fr)` : '1fr',
            gap: 6,
            padding: '6px 8px',
            height: 'calc(100dvh - 130px)',
            boxSizing: 'border-box' as const,
          }}>
            {laneNums.map(laneNum => (
              <div key={laneNum} style={{
                display: 'flex', flexDirection: 'column' as const, gap: 5,
                height: '100%',
              }}>
                {numLanes > 1 && (
                  <div style={{ textAlign: 'center', background: '#1e40af', borderRadius: 8, padding: '4px 0', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                    🏊 מסלול {laneNum}
                  </div>
                )}
                {grouped[laneNum].map(p => {
                  const count = lapCounts[p.id] || 0;
                  const done = count >= requiredLaps && requiredLaps > 0;
                  const cooldown = !!(lastTap[p.id] && Date.now() - lastTap[p.id] < 7000);
                  return (
                    <div key={p.id} style={{
                      background: done ? '#052e16' : '#1e293b',
                      border: `2px solid ${done ? '#16a34a' : '#334155'}`,
                      borderRadius: 12,
                      padding: tiny ? '4px 8px' : compact ? '6px 10px' : '10px 12px',
                      flex: 1,
                      display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
                      minHeight: 0,
                    }}>
                      {/* Name + bib */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ background: done ? '#16a34a' : '#0ea5e9', color: 'white', fontFamily: 'monospace', fontSize: tiny ? 11 : compact ? 13 : 17, fontWeight: 900, borderRadius: 7, padding: tiny ? '2px 5px' : '3px 8px', flexShrink: 0 }}>
                          {p.bib_number || '—'}
                        </div>
                        <div style={{ fontSize: tiny ? 12 : compact ? 14 : 18, fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>
                          {p.first_name} {p.last_name}
                        </div>
                        {done && <div style={{ background: '#16a34a', color: 'white', borderRadius: 6, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</div>}
                      </div>

                      {/* Counter */}
                      <div style={{ textAlign: 'center', lineHeight: 1 }}>
                        <span style={{ fontSize: tiny ? 28 : compact ? 36 : 52, fontWeight: 900, fontFamily: 'monospace' }}>{count}</span>
                        <span style={{ fontSize: tiny ? 14 : compact ? 18 : 26, color: '#475569', margin: '0 4px' }}>/</span>
                        <span style={{ fontSize: tiny ? 18 : compact ? 22 : 32, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{requiredLaps}</span>
                      </div>

                      {/* Button */}
                      {!done ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => addLap(p)} style={{ flex: 1, background: cooldown ? '#166534' : '#16a34a', color: cooldown ? '#86efac' : 'white', border: 'none', borderRadius: 9, padding: tiny ? '6px 0' : compact ? '10px 0' : '14px 0', fontSize: tiny ? 18 : compact ? 22 : 28, fontWeight: 900, cursor: cooldown ? 'not-allowed' : 'pointer', userSelect: 'none' as const, opacity: cooldown ? 0.6 : 1 }}>
                            {cooldown ? '⏳' : '+'}
                          </button>
                          {count > 0 && (
                            <button onClick={() => undoLap(p)} style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 9, padding: tiny ? '6px 8px' : '10px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Minus size={tiny ? 14 : 16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ background: '#16a34a', color: 'white', borderRadius: 8, padding: '6px 0', textAlign: 'center', fontWeight: 700, fontSize: tiny ? 11 : 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Check size={12} />
                          {finishedAt[p.id] ? new Date(finishedAt[p.id]).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'סיים'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
