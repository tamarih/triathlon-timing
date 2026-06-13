import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event } from '../../lib/types';
import { Users, Trophy, Timer, TrendingUp } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface Stats {
  total: number; paid: number; started: number; finished: number;
  dnf: number; dns: number; dsq: number; swim_done: number; bike_done: number;
}

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 900, margin: '0 auto', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  live: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', marginBottom: 16, fontFamily: 'system-ui' },
  eventBanner: { background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  statCard: (color: string) => ({ background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '16px', borderTop: `3px solid ${color}` }),
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 },
  statValue: { fontSize: 32, fontWeight: 800, color: '#111827' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  card: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  quickLink: { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '16px', textAlign: 'center' as const, textDecoration: 'none', display: 'block', border: '1.5px solid #f3f4f6' },
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);

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
    const { data: parts } = await supabase.from('participants').select('status, payment_status').eq('event_id', selectedEvent);
    const { data: timings } = await supabase.from('timing_records').select('station').eq('event_id', selectedEvent);
    if (parts) {
      setStats({
        total: parts.length,
        paid: parts.filter(p => p.payment_status === 'paid' || p.payment_status === 'exempt').length,
        started: parts.filter(p => p.status === 'started').length,
        finished: parts.filter(p => p.status === 'finished').length,
        dnf: parts.filter(p => p.status === 'dnf').length,
        dns: parts.filter(p => p.status === 'dns').length,
        dsq: parts.filter(p => p.status === 'dsq').length,
        swim_done: timings?.filter(t => t.station === 1).length || 0,
        bike_done: timings?.filter(t => t.station === 2).length || 0,
      });
    }
  }

  const event = events.find(e => e.id === selectedEvent);

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={S.header}>
        <span style={S.title}>לוח בקרה</span>
        <div style={S.live}><span style={S.dot} />עדכון בזמן אמת</div>
      </div>

      <select style={S.select} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
        <option value="">-- בחרו אירוע --</option>
        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.date)})</option>)}
      </select>

      {event && (
        <div style={S.eventBanner}>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: 15 }}>{event.name}</div>
            <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 2 }}>{formatDate(event.date)} · {event.location}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: event.status === 'open' ? '#dcfce7' : '#f3f4f6', color: event.status === 'open' ? '#15803d' : '#6b7280' }}>
            {event.status === 'open' ? '✅ פתוח' : event.status === 'closed' ? '🔒 סגור' : '🏁 הסתיים'}
          </span>
        </div>
      )}

      {stats && (
        <>
          <div style={S.statsGrid}>
            {[
              { icon: <Users size={18} color="#3b82f6" />, label: 'נרשמים', value: stats.total, color: '#3b82f6' },
              { icon: <TrendingUp size={18} color="#22c55e" />, label: 'שילמו', value: stats.paid, color: '#22c55e' },
              { icon: <Timer size={18} color="#f97316" />, label: 'מזנקים', value: stats.started, color: '#f97316' },
              { icon: <Trophy size={18} color="#eab308" />, label: 'סיימו', value: stats.finished, color: '#eab308' },
            ].map(sc => (
              <div key={sc.label} style={S.statCard(sc.color)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>{sc.icon}<span style={S.statLabel}>{sc.label}</span></div>
                <div style={S.statValue}>{sc.value}</div>
              </div>
            ))}
          </div>

          <div style={S.twoCol}>
            <div style={S.card}>
              <div style={S.cardTitle}>📍 התקדמות לפי תחנה</div>
              {[
                { label: '🏊 סיימו שחייה', value: stats.swim_done, color: '#3b82f6' },
                { label: '🚴 סיימו אופניים', value: stats.bike_done, color: '#f97316' },
                { label: '🏃 חצו קו סיום', value: stats.finished, color: '#22c55e' },
              ].map(pb => {
                const pct = stats.total > 0 ? Math.round((pb.value / stats.total) * 100) : 0;
                return (
                  <div key={pb.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ color: '#374151' }}>{pb.label}</span>
                      <span style={{ color: '#6b7280' }}>{pb.value}/{stats.total} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: pb.color, width: `${pct}%`, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>📊 סטטוסים</div>
              {[
                { label: '✅ סיימו', value: stats.finished, color: '#15803d' },
                { label: '🏃 בריצה', value: stats.started, color: '#2563eb' },
                { label: '⏭️ DNS', value: stats.dns, color: '#6b7280' },
                { label: '❌ DNF', value: stats.dnf, color: '#dc2626' },
                { label: '🚫 DSQ', value: stats.dsq, color: '#7c3aed' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 14, color: '#374151' }}>{item.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={S.quickGrid}>
        {[
          { to: '/admin/participants', label: 'משתתפים', icon: '👥' },
          { to: '/admin/timing', label: 'עריכת זמנים', icon: '⏱️' },
          { to: '/admin/results', label: 'תוצאות', icon: '🏆' },
          { to: '/admin/reports', label: 'דוחות', icon: '📊' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={S.quickLink}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
