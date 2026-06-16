import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Race, Participant } from '../../lib/types';

const TOTAL_LANES = 6;
const MAX_PER_LANE = 4;

export default function LaneView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');

  useEffect(() => {
    supabase.from('events').select('*').order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.length === 1) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) { setRaces([]); setSelectedRace(''); return; }
    supabase.from('races').select('*').eq('event_id', selectedEvent).order('name').then(({ data }) => {
      setRaces(data || []);
      if (data?.length === 1) setSelectedRace(data[0].id);
    });
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedRace) { setParticipants([]); return; }
    supabase.from('participants').select('*')
      .eq('event_id', selectedEvent).eq('race_id', selectedRace)
      .order('lane').order('bib_number')
      .then(({ data }) => setParticipants(data || []));
  }, [selectedRace, selectedEvent]);

  const lanes = useMemo(() => {
    const map: Record<number, Participant[]> = {};
    for (let i = 1; i <= TOTAL_LANES; i++) map[i] = [];
    for (const p of participants) {
      const lane = p.lane;
      if (lane && lane >= 1 && lane <= TOTAL_LANES) map[lane].push(p);
    }
    return map;
  }, [participants]);

  const totalAssigned = participants.filter(p => p.lane && p.lane >= 1).length;
  const totalSlots = TOTAL_LANES * MAX_PER_LANE;

  return (
    <div style={{ direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 40 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 }}>תצוגת מסלולי בריכה</div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#f9fafb', outline: 'none', fontFamily: 'system-ui', minWidth: 160 }}>
          <option value="">-- בחרו אירוע --</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)} disabled={!selectedEvent}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#f9fafb', outline: 'none', fontFamily: 'system-ui', minWidth: 160 }}>
          <option value="">-- בחרו מקצה --</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {selectedRace && (
          <span style={{ fontSize: 13, color: '#6b7280', marginRight: 4 }}>
            {totalAssigned} / {totalSlots} מקומות תפוסים
          </span>
        )}
      </div>

      {/* Lane grid */}
      {selectedRace && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {Array.from({ length: TOTAL_LANES }, (_, i) => i + 1).map(laneNum => {
            const swimmers = lanes[laneNum] || [];
            const freeSlots = MAX_PER_LANE - swimmers.length;
            return (
              <div key={laneNum} style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {/* Lane header */}
                <div style={{ background: '#1e3a8a', color: 'white', padding: '10px 14px', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🏊 מסלול {laneNum}</span>
                  <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 8px' }}>
                    {swimmers.length}/{MAX_PER_LANE}
                  </span>
                </div>

                <div style={{ padding: 10 }}>
                  {/* Assigned swimmers */}
                  {swimmers.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#eff6ff', borderRadius: 10, marginBottom: 6 }}>
                      <span style={{ background: '#0ea5e9', color: 'white', fontFamily: 'monospace', fontSize: 12, fontWeight: 800, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>
                        {p.bib_number || '—'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>
                        {p.first_name} {p.last_name}
                      </span>
                    </div>
                  ))}

                  {/* Free slots */}
                  {Array.from({ length: freeSlots }).map((_, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f9fafb', border: '1.5px dashed #e5e7eb', borderRadius: 10, marginBottom: 6, color: '#9ca3af', fontSize: 13 }}>
                      <span style={{ fontSize: 16 }}>○</span> פנוי
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!selectedRace && (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 40 }}>
          בחרו אירוע ומקצה לצפייה במסלולים
        </div>
      )}
    </div>
  );
}
