import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Participant, Event } from '../../lib/types';
import toast from 'react-hot-toast';

const S = {
  page: { minHeight: '100vh', background: '#111827', color: 'white', padding: 16, direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif' },
  inner: { maxWidth: 480, margin: '0 auto' },
  header: { textAlign: 'center' as const, marginBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: 800 },
  card: { background: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 },
  select: { width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'system-ui', marginBottom: 12, boxSizing: 'border-box' as const },
  stationGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  stationBtn: (active: boolean): React.CSSProperties => ({ padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? '#2563eb' : '#374151', color: active ? 'white' : '#d1d5db', transition: 'background 0.15s' }),
  stationLabel: { fontSize: 12, color: '#60a5fa', textAlign: 'center' as const, marginTop: 6 },
  bibInput: { width: '100%', background: '#111827', border: '2px solid #4b5563', borderRadius: 14, padding: '20px 16px', fontSize: 48, fontWeight: 800, textAlign: 'center' as const, color: 'white', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 14, fontFamily: 'monospace' },
  submitBtn: (disabled: boolean): React.CSSProperties => ({ width: '100%', background: disabled ? '#374151' : '#16a34a', color: disabled ? '#6b7280' : 'white', border: 'none', borderRadius: 14, padding: '16px 0', fontSize: 18, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer' }),
  recentCard: { background: '#1f2937', borderRadius: 16, padding: 16 },
  recentTitle: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  recentRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#374151', borderRadius: 10, padding: '8px 12px', marginBottom: 8 },
  recentName: { fontWeight: 600, fontSize: 14 },
  recentBib: { fontFamily: 'monospace', color: '#60a5fa', fontSize: 13 },
  recentTime: { fontSize: 11, color: '#9ca3af', textAlign: 'right' as const },
};

const stationLabels: Record<number, string> = {
  1: 'תחנה 1 — יציאה משחייה',
  2: 'תחנה 2 — סיום אופניים',
  3: 'תחנה 3 — קו סיום',
};

export default function TimingStation() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [station, setStation] = useState<1 | 2 | 3>(appUser?.assigned_station || 1);
  const [bibInput, setBibInput] = useState('');
  const [recentRecords, setRecentRecords] = useState<Array<{ participant: Participant; time: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open', 'closed']).order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.length === 1) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const bib = bibInput.trim();
    if (!bib || !selectedEvent) return;
    setSubmitting(true);

    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', selectedEvent)
        .eq('bib_number', bib);

      if (!participants || participants.length === 0) {
        toast.error(`מספר ${bib} לא נמצא!`, { duration: 3000 });
        setBibInput('');
        inputRef.current?.focus();
        setSubmitting(false);
        return;
      }

      const participant = participants[0];

      const { data: existing } = await supabase
        .from('timing_records')
        .select('id')
        .eq('participant_id', participant.id)
        .eq('station', station);

      if (existing && existing.length > 0) {
        toast(`⚠️ ${participant.first_name} ${participant.last_name} כבר נקלט בתחנה זו!`, {
          style: { background: '#FEF3C7', color: '#92400E' },
          duration: 4000,
        });
        setBibInput('');
        inputRef.current?.focus();
        setSubmitting(false);
        return;
      }

      // Insert without recorded_at — DB uses server DEFAULT NOW()
      const { data: insertedRecord, error } = await supabase
        .from('timing_records')
        .insert({
          event_id: selectedEvent,
          participant_id: participant.id,
          station,
          recorded_by: appUser?.email,
        })
        .select('recorded_at')
        .single();

      if (error) throw error;

      const serverTime = insertedRecord?.recorded_at || new Date().toISOString();

      if (station === 3) {
        await supabase.from('participants').update({ status: 'finished' }).eq('id', participant.id);
      } else if (station === 1 && participant.status === 'registered') {
        await supabase.from('participants').update({ status: 'started' }).eq('id', participant.id);
      }

      toast.success(`✅ ${participant.first_name} ${participant.last_name} נקלט! מס' ${bib}`, { duration: 2500 });
      setRecentRecords(prev => [{ participant, time: serverTime }, ...prev.slice(0, 9)]);
      setBibInput('');
      inputRef.current?.focus();

      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        setTimeout(() => osc.stop(), 150);
      } catch {}

    } catch (err: any) {
      toast.error(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !selectedEvent || !bibInput.trim() || submitting;

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.header}>
          <div style={S.headerTitle}>⏱️ קליטת זמנים</div>
        </div>

        <div style={S.card}>
          <label style={S.label}>אירוע</label>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={S.select}>
            <option value="">-- בחרו אירוע --</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>

          <label style={S.label}>תחנה</label>
          <div style={S.stationGrid}>
            {([1, 2, 3] as const).map(s => (
              <button key={s} onClick={() => setStation(s)} style={S.stationBtn(station === s)}>
                תחנה {s}
              </button>
            ))}
          </div>
          <div style={S.stationLabel}>{stationLabels[station]}</div>
        </div>

        <div style={S.card}>
          <form onSubmit={handleSubmit}>
            <label style={S.label}>מספר משתתף</label>
            <input
              ref={inputRef}
              type="text"
              value={bibInput}
              onChange={e => setBibInput(e.target.value)}
              placeholder="הזינו מספר..."
              style={S.bibInput}
              disabled={!selectedEvent || submitting}
              autoComplete="off"
              inputMode="numeric"
            />
            <button type="submit" disabled={disabled} style={S.submitBtn(disabled)}>
              {submitting ? '...' : '✅ שמירה'}
            </button>
          </form>
        </div>

        {recentRecords.length > 0 && (
          <div style={S.recentCard}>
            <div style={S.recentTitle}>נקלטו לאחרונה:</div>
            {recentRecords.map((rec, i) => (
              <div key={i} style={S.recentRow}>
                <span style={S.recentName}>{rec.participant.first_name} {rec.participant.last_name}</span>
                <div>
                  <div style={S.recentBib}>{rec.participant.bib_number}</div>
                  <div style={S.recentTime}>{new Date(rec.time).toLocaleTimeString('he-IL')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
