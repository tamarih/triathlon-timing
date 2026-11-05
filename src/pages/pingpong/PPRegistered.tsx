import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PP, ppPage, ppWrap, ppCard, ppInput } from './theme';

export default function PPRegistered() {
  const navigate = useNavigate();
  const [names, setNames] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only names are fetched — no ages or phones shown publicly.
    supabase.from('tt_participants').select('full_name').order('full_name').then(({ data }) => {
      setNames((data || []).map((r: any) => r.full_name as string));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? names.filter(n => n.toLowerCase().includes(q)) : names;
  }, [names, search]);

  return (
    <div style={ppPage}>
      <div style={ppWrap}>
        <button onClick={() => navigate('/pingpong')} style={{ background: 'none', border: 'none', color: PP.dim, cursor: 'pointer', fontSize: 14, padding: '10px 0' }}>← חזרה</button>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 4px' }}>📋 רשימת הנרשמים</h1>
        <p style={{ color: PP.dim, fontSize: 14, marginBottom: 14 }}>שכחתם אם נרשמתם? חפשו את השם שלכם כאן.</p>

        <input style={ppInput} placeholder="🔍 חיפוש שם..." value={search} onChange={e => setSearch(e.target.value)} />

        <div style={{ fontSize: 13, color: PP.dim, marginBottom: 10 }}>{loading ? 'טוען...' : `${names.length} נרשמו`}</div>

        <div style={{ ...ppCard, padding: 10 }}>
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: PP.dim, padding: 20 }}>
              {names.length === 0 ? 'עדיין אין נרשמים 🏓' : 'לא נמצא שם כזה — אולי עדיין לא נרשמתם?'}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filtered.map((n, i) => (
              <span key={i} style={{ background: '#0e1626', border: `1px solid ${PP.line}`, borderRadius: 999, padding: '7px 14px', fontSize: 14, fontWeight: 600 }}>{n}</span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button onClick={() => navigate('/pingpong/register')} style={{ background: 'linear-gradient(135deg,#ff7a18,#d6002a)', color: 'white', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
            🏓 עדיין לא נרשמתם? להרשמה
          </button>
        </div>
      </div>
    </div>
  );
}
