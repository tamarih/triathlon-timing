import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event } from '../../lib/types';
import { Users, Trophy, Timer, TrendingUp } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface Stats {
  total: number; paid: number; started: number;
  finished: number; dnf: number; dns: number; dsq: number;
  swim_done: number; bike_done: number;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [_loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      const active = data?.find(e => e.status === 'open' || e.status === 'closed');
      if (active) setSelectedEvent(active.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    loadStats();

    const sub = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${selectedEvent}` }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timing_records', filter: `event_id=eq.${selectedEvent}` }, loadStats)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [selectedEvent]);

  async function loadStats() {
    setLoading(true);
    const { data: parts } = await supabase.from('participants').select('status, payment_status').eq('event_id', selectedEvent);
    const { data: timings } = await supabase.from('timing_records').select('station').eq('event_id', selectedEvent);

    if (parts) {
      const s: Stats = {
        total: parts.length,
        paid: parts.filter(p => p.payment_status === 'paid' || p.payment_status === 'exempt').length,
        started: parts.filter(p => p.status === 'started').length,
        finished: parts.filter(p => p.status === 'finished').length,
        dnf: parts.filter(p => p.status === 'dnf').length,
        dns: parts.filter(p => p.status === 'dns').length,
        dsq: parts.filter(p => p.status === 'dsq').length,
        swim_done: timings?.filter(t => t.station === 1).length || 0,
        bike_done: timings?.filter(t => t.station === 2).length || 0,
      };
      setStats(s);
    }
    setLoading(false);
  }

  const event = events.find(e => e.id === selectedEvent);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-500">עדכון בזמן אמת</span>
        </div>
      </div>

      <div className="mb-6">
        <select
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">-- בחרו אירוע --</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.date)})</option>)}
        </select>
      </div>

      {event && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <div>
            <div className="font-medium text-blue-900">{event.name}</div>
            <div className="text-sm text-blue-600">{formatDate(event.date)} · {event.location}</div>
          </div>
          <span className={`mr-auto px-2 py-0.5 rounded-full text-xs font-medium ${
            event.status === 'open' ? 'bg-green-100 text-green-700' :
            event.status === 'finished' ? 'bg-gray-100 text-gray-600' :
            'bg-orange-100 text-orange-700'
          }`}>
            {event.status === 'open' ? 'פתוח' : event.status === 'closed' ? 'סגור' : event.status === 'finished' ? 'הסתיים' : 'טיוטה'}
          </span>
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<Users size={20} className="text-blue-500" />} label="נרשמים" value={stats.total} color="blue" />
            <StatCard icon={<TrendingUp size={20} className="text-green-500" />} label="שילמו" value={stats.paid} color="green" />
            <StatCard icon={<Timer size={20} className="text-orange-500" />} label="מזנקים" value={stats.started} color="orange" />
            <StatCard icon={<Trophy size={20} className="text-yellow-500" />} label="סיימו" value={stats.finished} color="yellow" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Progress by station */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-medium text-gray-900 mb-4">התקדמות לפי תחנה</h3>
              <div className="space-y-3">
                <ProgressBar label="🏊 סיימו שחייה" value={stats.swim_done} total={stats.total} color="blue" />
                <ProgressBar label="🚴 סיימו אופניים" value={stats.bike_done} total={stats.total} color="orange" />
                <ProgressBar label="🏃 חצו קו סיום" value={stats.finished} total={stats.total} color="green" />
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-medium text-gray-900 mb-4">סטטוסים</h3>
              <div className="space-y-2">
                {[
                  { label: 'סיימו', value: stats.finished, color: 'text-green-600' },
                  { label: 'בריצה', value: stats.started, color: 'text-blue-600' },
                  { label: 'DNS', value: stats.dns, color: 'text-gray-500' },
                  { label: 'DNF', value: stats.dnf, color: 'text-red-500' },
                  { label: 'DSQ', value: stats.dsq, color: 'text-purple-500' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/admin/participants', label: 'ניהול משתתפים', icon: '👥' },
          { to: '/admin/timing', label: 'עריכת זמנים', icon: '⏱️' },
          { to: '/admin/results', label: 'תוצאות', icon: '🏆' },
          { to: '/admin/reports', label: 'דוחות', icon: '📊' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="text-sm font-medium text-gray-700">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm text-gray-500">{label}</span></div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{value}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full bg-${color}-500 transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
