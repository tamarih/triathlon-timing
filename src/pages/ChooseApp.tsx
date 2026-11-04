import { Link } from 'react-router-dom';

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
    background: 'radial-gradient(1200px 600px at 50% -10%, #1e3a8a 0%, #0b1220 60%, #050810 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px', color: 'white',
  },
  title: { fontSize: 30, fontWeight: 900, textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: '#9fb3d1', textAlign: 'center', marginBottom: 32 },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center', width: '100%', maxWidth: 760 },
  card: {
    flex: '1 1 300px', minWidth: 260, maxWidth: 360, borderRadius: 24, padding: '30px 24px',
    textDecoration: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
    transition: 'transform .15s',
  },
  emoji: { fontSize: 64, marginBottom: 12, lineHeight: 1 },
  cardTitle: { fontSize: 24, fontWeight: 900, marginBottom: 6 },
  cardText: { fontSize: 14, opacity: 0.92, marginBottom: 18, lineHeight: 1.5 },
  cta: { background: 'rgba(255,255,255,0.95)', borderRadius: 999, padding: '11px 22px', fontSize: 15, fontWeight: 800 },
  foot: { marginTop: 34, fontSize: 13, color: '#6b7fa3', textAlign: 'center' },
};

export default function ChooseApp() {
  return (
    <div style={S.page}>
      <div style={S.title}>יקנעם מושבה · אירועי ספורט</div>
      <div style={S.sub}>בחרו את האירוע שלכם 👇</div>
      <div style={S.grid}>
        <Link to="/pingpong" style={{ ...S.card, background: 'linear-gradient(160deg,#ff7a18,#d6002a)' }}>
          <div style={S.emoji}>🏓</div>
          <div style={S.cardTitle}>טורניר טניס שולחן</div>
          <div style={S.cardText}>הירשמו, קחו מחבט ובואו להתחרות על המקום הראשון! 🏆</div>
          <div style={{ ...S.cta, color: '#d6002a' }}>להרשמה ולטורניר ←</div>
        </Link>
        <Link to="/triathlon" style={{ ...S.card, background: 'linear-gradient(160deg,#1d4ed8,#0ea5e9)' }}>
          <div style={S.emoji}>🏊🚴🏃</div>
          <div style={S.cardTitle}>טריאתלון יקנעם</div>
          <div style={S.cardText}>מידע, הרשמה, ותוצאות האירוע.</div>
          <div style={{ ...S.cta, color: '#1d4ed8' }}>לאתר הטריאתלון ←</div>
        </Link>
      </div>
      <div style={S.foot}>ועדת ספורט · יקנעם מושבה</div>
    </div>
  );
}
