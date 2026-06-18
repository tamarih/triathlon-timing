import { useNavigate } from 'react-router-dom';

export default function ChooseRole() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: 'system-ui', padding: 24, gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>בחרו תפקיד לסשן זה</div>
      <button onClick={() => navigate('/pool')} style={{ width: '100%', maxWidth: 320, background: '#1e40af', border: '2px solid #3b82f6', borderRadius: 16, padding: '20px 0', fontSize: 20, fontWeight: 800, color: 'white', cursor: 'pointer' }}>
        🏊 שיפוט בריכה
      </button>
      <button onClick={() => navigate('/volunteer')} style={{ width: '100%', maxWidth: 320, background: '#064e3b', border: '2px solid #10b981', borderRadius: 16, padding: '20px 0', fontSize: 20, fontWeight: 800, color: 'white', cursor: 'pointer' }}>
        ⏱️ תחנת תיזמון
      </button>
    </div>
  );
}
