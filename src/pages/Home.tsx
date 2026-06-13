import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event } from '../lib/types';
import { formatDate, countdownString } from '../lib/utils';
import { Calendar, MapPin } from 'lucide-react';

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #1e3a8a 0%, #0284c7 60%, #38bdf8 100%)',
    direction: 'rtl' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  } as React.CSSProperties,
  inner: {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column' as const,
  } as React.CSSProperties,
  hero: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    padding: '48px 20px 32px',
    color: 'white',
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    padding: 0,
    overflow: 'hidden',
  } as React.CSSProperties,
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    mixBlendMode: 'multiply' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: '0 0 4px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.75,
    margin: '0 0 28px',
    fontWeight: 400,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    width: '100%',
    maxWidth: 300,
  },
  btnPrimary: {
    flex: 1,
    background: 'white',
    color: '#1e3a8a',
    border: 'none',
    borderRadius: 12,
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
  },
  btnSecondary: {
    flex: 1,
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    border: '1.5px solid rgba(255,255,255,0.35)',
    borderRadius: 12,
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  disciplines: {
    display: 'flex',
    justifyContent: 'center',
    gap: 0,
    borderTop: '1px solid rgba(255,255,255,0.15)',
    marginTop: 28,
    paddingTop: 20,
    paddingBottom: 4,
    width: '100%',
    maxWidth: 320,
  },
  disciplineItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
  },
  body: {
    background: '#f8fafc',
    borderRadius: '24px 24px 0 0',
    minHeight: '60vh',
    padding: '24px 20px 40px',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  card: {
    background: 'white',
    borderRadius: 18,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  cardBody: {
    padding: '16px',
  },
  badge: (open: boolean) => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 99,
    background: open ? '#dcfce7' : '#f3f4f6',
    color: open ? '#15803d' : '#6b7280',
    marginBottom: 8,
  }),
  cardTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 10px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  countdown: {
    background: '#eff6ff',
    borderRadius: 12,
    padding: '10px 14px',
    textAlign: 'center' as const,
    marginTop: 12,
    borderTop: '1px solid #e0f2fe',
  },
  cardBtnRow: {
    display: 'flex',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid #f3f4f6',
  },
  cardBtnPrimary: {
    flex: 1,
    background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    boxShadow: '0 3px 10px rgba(14,165,233,0.3)',
  },
  cardBtnSecondary: {
    flex: 1,
    background: 'white',
    color: '#374151',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#9ca3af',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#9ca3af',
    fontSize: 12,
    background: '#f8fafc',
  },
};

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open', 'closed']).order('date').then(({ data }) => {
      setEvents(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const c: Record<string, string> = {};
      events.forEach(e => { c[e.id] = countdownString(e.date, e.start_time); });
      setCountdown(c);
    }, 1000);
    return () => clearInterval(interval);
  }, [events]);

  return (
    <div style={S.page}>
      <div style={S.inner}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={S.logoWrap}>
          <img src="/logo.png" alt="לוגו" style={S.logo} />
        </div>
        <h1 style={S.title}>טריאתלון יקנעם מושבה</h1>
        <p style={S.subtitle}>האירוע הספורטיבי הגדול של הקהילה</p>

        <div style={S.btnRow}>
          <Link to="/register" style={S.btnPrimary}>🏁 הרשמה</Link>
          <Link to="/results" style={S.btnSecondary}>🏆 תוצאות</Link>
        </div>

        <div style={S.disciplines}>
          {[
            { icon: '🏊', label: 'שחייה' },
            { icon: '🚴', label: 'אופניים' },
            { icon: '🏃', label: 'ריצה' },
          ].map(d => (
            <div key={d.label} style={S.disciplineItem}>
              <span style={{ fontSize: 28 }}>{d.icon}</span>
              <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={S.sectionTitle}>
            <span style={{ width: 3, height: 18, background: '#0ea5e9', borderRadius: 2, display: 'inline-block' }} />
            אירועים קרובים
          </div>

          {loading ? (
            <div style={S.empty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p>טוען...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏁</div>
              <p style={{ fontWeight: 600, color: '#6b7280' }}>אין אירועים פעילים כרגע</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>בקרו שוב בקרוב</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} style={S.card}>
                {event.banner_url && (
                  <img src={event.banner_url} alt={event.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={S.cardBody}>
                  <span style={S.badge(event.status === 'open')}>
                    {event.status === 'open' ? '✅ פתוח להרשמה' : '🔒 סגור'}
                  </span>
                  <h3 style={S.cardTitle}>{event.name}</h3>

                  <div style={S.meta}>
                    <Calendar size={13} color="#0ea5e9" />
                    <span>{formatDate(event.date)} · {event.start_time?.slice(0, 5)}</span>
                  </div>
                  <div style={S.meta}>
                    <MapPin size={13} color="#0ea5e9" />
                    <span>{event.location}</span>
                  </div>

                  {countdown[event.id] && (
                    <div style={S.countdown}>
                      <div style={{ fontSize: 11, color: '#0ea5e9', marginBottom: 2, fontWeight: 600 }}>⏱️ עד האירוע</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a' }}>{countdown[event.id]}</div>
                    </div>
                  )}

                  <div style={S.cardBtnRow}>
                    {event.status === 'open' && (
                      <Link to={`/register?event=${event.id}`} style={S.cardBtnPrimary}>הרשמה</Link>
                    )}
                    <Link to={`/results?event=${event.id}`} style={S.cardBtnSecondary}>תוצאות חיות</Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={S.footer}>טריאתלון יקנעם מושבה © 2025</div>
      </div>
    </div>
  );
}
