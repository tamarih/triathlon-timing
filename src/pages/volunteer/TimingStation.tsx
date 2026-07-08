import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Participant, Event } from '../../lib/types';
import toast from 'react-hot-toast';
import { Home, LogOut, Trash2, QrCode, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
  recentRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#374151', borderRadius: 10, padding: '8px 12px', marginBottom: 8, gap: 8 },
  recentName: { fontWeight: 600, fontSize: 14 },
  recentBib: { fontFamily: 'monospace', color: '#60a5fa', fontSize: 13 },
  recentTime: { fontSize: 11, color: '#9ca3af', textAlign: 'right' as const },
  undoBtn: { background: '#7f1d1d', color: '#fecaca', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
};

const stationLabels: Record<number, string> = {
  1: 'תחנה 1 — יציאה משחייה',
  2: 'תחנה 2 — סיום אופניים',
  3: 'תחנה 3 — קו סיום',
};

export default function TimingStation() {
  const { appUser, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [station, setStation] = useState<1 | 2 | 3>(appUser?.assigned_station || 1);
  const [bibInput, setBibInput] = useState('');
  const [recentRecords, setRecentRecords] = useState<Array<{ recordId: string; participant: Participant; time: string; station: 1 | 2 | 3 }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const qrDivId = 'qr-reader';

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open', 'closed']).order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.length === 1) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!scanning) return;
    const qr = new Html5Qrcode(qrDivId);
    qrRef.current = qr;
    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => {
        const bib = decoded.trim();
        setScanning(false);
        setBibInput(bib);
        // auto-submit on next tick after state settles
        setTimeout(() => processSubmit(bib), 150);
      },
      () => {}
    ).catch(() => {
      toast.error('לא ניתן לגשת למצלמה');
      setScanning(false);
    });
    return () => { qr.stop().catch(() => {}); };
  }, [scanning]);

  async function processSubmit(rawBib: string) {
    // Search by both the raw value (e.g. "0001") and the numeric value (e.g. "1")
    const bib = rawBib.trim();
    const bibNumeric = String(parseInt(bib, 10));
    const bibPadded4 = bibNumeric.padStart(4, '0');
    if (!bib || !selectedEvent) return;
    setSubmitting(true);

    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', selectedEvent)
        .in('bib_number', [bib, bibNumeric, bibPadded4]);

      if (!participants || participants.length === 0) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(); osc.stop(ctx.currentTime + 0.4);
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
        .select('id, recorded_at')
        .single();

      if (error) throw error;

      const serverTime = insertedRecord?.recorded_at || new Date().toISOString();

      if (station === 3) {
        await supabase.from('participants').update({ status: 'finished' }).eq('id', participant.id);
      } else if (station === 1 && participant.status === 'registered') {
        await supabase.from('participants').update({ status: 'started' }).eq('id', participant.id);
      }

      toast.success(`✅ ${participant.first_name} ${participant.last_name} נקלט! מס' ${bib}`, { duration: 2500 });
      setRecentRecords(prev => [{ recordId: insertedRecord.id, participant, time: serverTime, station }, ...prev.slice(0, 9)]);
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

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    processSubmit(bibInput.trim());
  }

  async function undoRecord(rec: { recordId: string; participant: Participant; station: 1 | 2 | 3 }) {
    if (!confirm(`לבטל את קליטת ${rec.participant.first_name} ${rec.participant.last_name} (מס' ${rec.participant.bib_number})?`)) return;
    try {
      const { error } = await supabase.from('timing_records').delete().eq('id', rec.recordId);
      if (error) throw error;

      // Revert participant status when applicable
      if (rec.station === 3) {
        await supabase.from('participants').update({ status: 'started' }).eq('id', rec.participant.id);
      } else if (rec.station === 1) {
        // Only revert to 'registered' if there are no other records for this participant
        const { data: others } = await supabase.from('timing_records').select('id').eq('participant_id', rec.participant.id).limit(1);
        if (!others || others.length === 0) {
          await supabase.from('participants').update({ status: 'registered' }).eq('id', rec.participant.id);
        }
      }

      setRecentRecords(prev => prev.filter(r => r.recordId !== rec.recordId));
      toast.success('הקליטה בוטלה');
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בביטול');
    }
  }

  const disabled = !selectedEvent || !bibInput.trim() || submitting;

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ flex: 1 }} />
          <div style={S.headerTitle}>⏱️ קליטת זמנים</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button onClick={() => navigate(appUser?.role === 'admin' ? '/admin' : '/')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Home size={15} />
            </button>
            <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
              <LogOut size={15} /> יציאה
            </button>
          </div>
        </div>

        <div style={S.card}>
          <label style={S.label}>אירוע</label>
          {selectedEvent ? (
            <div style={{ ...S.select, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'default' }}>
              <span>{events.find(ev => ev.id === selectedEvent)?.name}</span>
            </div>
          ) : (
            <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={S.select}>
              <option value="">-- בחרו אירוע --</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          )}

          <label style={S.label}>תחנה</label>
          {appUser?.assigned_station ? (
            <div style={{ background: '#2563eb', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 700, color: 'white', textAlign: 'center' as const }}>
              {stationLabels[appUser.assigned_station]}
            </div>
          ) : (
            <>
              <div style={S.stationGrid}>
                {([1, 2, 3] as const).map(s => (
                  <button key={s} onClick={() => setStation(s)} style={S.stationBtn(station === s)}>
                    תחנה {s}
                  </button>
                ))}
              </div>
              <div style={S.stationLabel}>{stationLabels[station]}</div>
            </>
          )}
        </div>

        <div style={S.card}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...S.label, margin: 0 }}>מספר משתתף</label>
              <button
                type="button"
                onClick={() => setScanning(s => !s)}
                disabled={!selectedEvent}
                style={{ background: scanning ? '#dc2626' : '#2563eb', border: 'none', borderRadius: 8, padding: '5px 10px', color: 'white', cursor: selectedEvent ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600 }}
              >
                {scanning ? <><X size={14} /> סגור מצלמה</> : <><QrCode size={14} /> סריקת QR</>}
              </button>
            </div>
            {scanning && (
              <div style={{ marginBottom: 12 }}>
                <div id={qrDivId} style={{ borderRadius: 12, overflow: 'hidden' }} />
              </div>
            )}
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
            {recentRecords.map(rec => (
              <div key={rec.recordId} style={S.recentRow}>
                <span style={S.recentName}>{rec.participant.first_name} {rec.participant.last_name}</span>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={S.recentBib}>{rec.participant.bib_number}</div>
                  <div style={S.recentTime}>{new Date(rec.time).toLocaleTimeString('he-IL')}</div>
                </div>
                <button type="button" onClick={() => undoRecord(rec)} style={S.undoBtn} title="ביטול הקליטה">
                  <Trash2 size={14} /> בטל
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
