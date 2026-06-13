import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Participant, Event } from '../../lib/types';
import toast from 'react-hot-toast';

export default function TimingStation() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [station, setStation] = useState<1 | 2 | 3>(appUser?.assigned_station || 1);
  const [bibInput, setBibInput] = useState('');
  const [recentRecords, setRecentRecords] = useState<Array<{ participant: Participant; time: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const stationLabels: Record<number, string> = {
    1: 'תחנה 1 — יציאה משחייה',
    2: 'תחנה 2 — סיום אופניים',
    3: 'תחנה 3 — קו סיום',
  };

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open','closed']).order('date').then(({ data }) => {
      setEvents(data || []);
      if (data?.length === 1) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const bib = bibInput.trim();
    if (!bib || !selectedEvent) return;
    setSubmitting(true);

    try {
      // Find participant
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', selectedEvent)
        .eq('bib_number', bib);

      if (!participants || participants.length === 0) {
        toast.error(`מספר ${bib} לא נמצא!`, { icon: '❌', duration: 3000 });
        setBibInput('');
        inputRef.current?.focus();
        setSubmitting(false);
        return;
      }

      const participant = participants[0];

      // Check duplicate
      const { data: existing } = await supabase
        .from('timing_records')
        .select('*')
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

      const now = new Date().toISOString();
      const { error } = await supabase.from('timing_records').insert({
        event_id: selectedEvent,
        participant_id: participant.id,
        station,
        recorded_at: now,
        recorded_by: appUser?.email,
      });

      if (error) throw error;

      // Update participant status
      if (station === 3) {
        await supabase.from('participants').update({ status: 'finished' }).eq('id', participant.id);
      } else if (station === 1 && participant.status === 'registered') {
        await supabase.from('participants').update({ status: 'started' }).eq('id', participant.id);
      }

      const name = `${participant.first_name} ${participant.last_name}`;
      toast.success(`✅ ${name} נקלט! מס' ${bib}`, { duration: 2500 });

      setRecentRecords(prev => [{ participant, time: now }, ...prev.slice(0, 9)]);
      setBibInput('');
      inputRef.current?.focus();

      // Play beep sound
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.start();
      setTimeout(() => osc.stop(), 150);
    } catch (err: any) {
      toast.error(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">⏱️ קליטת זמנים</h1>
        </div>

        {/* Event & Station select */}
        <div className="bg-gray-800 rounded-xl p-4 mb-5 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">אירוע</label>
            <select
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- בחרו אירוע --</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">תחנה</label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStation(s)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    station === s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  תחנה {s}
                </button>
              ))}
            </div>
            <div className="text-xs text-blue-400 mt-1.5 text-center">{stationLabels[station]}</div>
          </div>
        </div>

        {/* BIB input */}
        <div className="bg-gray-800 rounded-xl p-5 mb-5">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-gray-400 mb-2">מספר משתתף</label>
            <input
              ref={inputRef}
              type="text"
              value={bibInput}
              onChange={e => setBibInput(e.target.value)}
              placeholder="הזינו מספר..."
              className="w-full bg-gray-900 border-2 border-gray-600 rounded-xl px-4 py-5 text-5xl font-bold text-center text-white focus:border-blue-500 focus:outline-none mb-4"
              disabled={!selectedEvent || submitting}
              autoComplete="off"
              inputMode="numeric"
            />
            <button
              type="submit"
              disabled={!selectedEvent || !bibInput.trim() || submitting}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl text-xl font-bold transition-colors"
            >
              {submitting ? '...' : '✅ שמירה'}
            </button>
          </form>
        </div>

        {/* Recent */}
        {recentRecords.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm text-gray-400 mb-3">נקלטו לאחרונה:</h3>
            <div className="space-y-2">
              {recentRecords.map((rec, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2">
                  <span className="font-medium">{rec.participant.first_name} {rec.participant.last_name}</span>
                  <div className="text-left">
                    <span className="font-mono text-blue-400 text-sm">{rec.participant.bib_number}</span>
                    <div className="text-xs text-gray-400">{new Date(rec.time).toLocaleTimeString('he-IL')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
