import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { loadSettings, type TTSettings } from '../../lib/pingpong';
import { PP, ppPage, ppWrap, ppCard, ppBtn, BallAnim, ppCountdown, ppFormatDate } from './theme';

export default function PPHome() {
  const [settings, setSettings] = useState<TTSettings | null>(null);
  const [count, setCount] = useState<number>(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    loadSettings().then(setSettings);
    supabase.from('tt_participants').select('id', { count: 'exact', head: true }).then(({ count }) => setCount(count || 0));
    const iv = setInterval(() => setTick(t => t + 1), 60000); // refresh countdown
    return () => clearInterval(iv);
  }, []);

  const name = settings?.tournament_name || 'טורניר טניס השולחן הגדול';
  const date = settings?.event_date || '2026-11-27';
  const location = settings?.location || 'בית העם';
  const intro = settings?.intro_text || 'מוכנים להוכיח מי אלוף טניס השולחן? הירשמו לטורניר, קחו מחבט ובואו להתחרות על המקום הראשון! 🏆';
  const regOpen = settings?.registration_open !== false;

  return (
    <div style={{ ...ppPage, position: 'relative', overflow: 'hidden' }}>
      <img src="/pp-lion.png" alt="" aria-hidden style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', width: 520, maxWidth: '150%', opacity: 0.05, pointerEvents: 'none', filter: 'blur(0.3px)' }} />
      <div style={{ ...ppWrap, position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', paddingTop: 18 }}>
          <img src="/pp-logo.png" alt="יקנעם מושבה" style={{ width: 130, height: 'auto', margin: '0 auto 8px', display: 'block', opacity: 1 }} />
          <BallAnim size={58} />
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: '10px 0 4px', lineHeight: 1.15 }}>🏓 {name}</h1>
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0 6px' }}>
            <span style={{ background: 'linear-gradient(135deg,#ff7a18,#d6002a)', borderRadius: 999, padding: '7px 16px', fontWeight: 800, fontSize: 15 }}>📅 {ppFormatDate(date)}</span>
            <span style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${PP.line}`, borderRadius: 999, padding: '7px 16px', fontWeight: 700, fontSize: 15 }}>📍 {location}</span>
          </div>
          <p style={{ color: PP.dim, fontSize: 16, lineHeight: 1.6, margin: '14px 6px 0' }}>{intro}</p>
        </div>

        {/* CTA */}
        <div style={{ margin: '22px 0 14px' }}>
          {regOpen ? (
            <Link to="/pingpong/register" style={ppBtn('linear-gradient(135deg,#ff7a18,#d6002a)')}>🏓 אני רוצה להשתתף!</Link>
          ) : (
            <div style={{ ...ppBtn('#374151'), cursor: 'default', boxShadow: 'none' }}>ההרשמה סגורה</div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...ppCard, flex: 1, textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: PP.orange }}>{count}</div>
            <div style={{ fontSize: 13, color: PP.dim, fontWeight: 700 }}>כבר נרשמו 🙌</div>
          </div>
          <div style={{ ...ppCard, flex: 1, textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: PP.text, marginTop: 4 }}>{ppCountdown(date)}</div>
            <div style={{ fontSize: 13, color: PP.dim, fontWeight: 700, marginTop: 4 }}>לתחילת הטורניר ⏳</div>
          </div>
        </div>

        <Link to="/pingpong/registered" style={{ display: 'block', textAlign: 'center', color: PP.orange, textDecoration: 'none', fontSize: 14, fontWeight: 700, marginTop: 12 }}>
          📋 לרשימת הנרשמים — לבדוק אם נרשמתם
        </Link>

        {/* Tournament view link */}
        <Link to="/pingpong/tournament" style={{ ...ppBtn('rgba(255,255,255,0.06)'), marginTop: 14, boxShadow: 'none', border: `1px solid ${PP.line}` }}>
          👀 לצפייה בטורניר (בתים, משחקים ותוצאות)
        </Link>

        {/* Footer links */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: 13 }}>
          <Link to="/" style={{ color: PP.dim, textDecoration: 'none' }}>← חזרה לבחירת אירוע</Link>
          <Link to="/pingpong/admin" style={{ color: PP.dim, textDecoration: 'none', opacity: 0.6 }}>כניסת מנהל</Link>
        </div>
      </div>
    </div>
  );
}
