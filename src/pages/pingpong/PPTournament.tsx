import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { genderHe, type TTCategory, type TTParticipant } from '../../lib/pingpong';
import { PP, ppPage, ppWrap, ppCard } from './theme';

export default function PPTournament() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<TTCategory[]>([]);
  const [people, setPeople] = useState<TTParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('tt_categories').select('*').order('sort'),
      supabase.from('tt_participants').select('*').order('full_name'),
    ]).then(([{ data: c }, { data: p }]) => {
      setCats((c || []) as TTCategory[]);
      setPeople((p || []) as TTParticipant[]);
      setLoading(false);
    });
  }, []);

  const uncategorized = people.filter(p => !p.category_id);

  return (
    <div style={ppPage}>
      <div style={ppWrap}>
        <button onClick={() => navigate('/pingpong')} style={{ background: 'none', border: 'none', color: PP.dim, cursor: 'pointer', fontSize: 14, padding: '10px 0' }}>← חזרה</button>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 16px' }}>👀 הטורניר</h1>

        {loading && <div style={{ ...ppCard, textAlign: 'center', color: PP.dim }}>טוען...</div>}

        {!loading && cats.length === 0 && (
          <div style={{ ...ppCard, textAlign: 'center', color: PP.dim, lineHeight: 1.7 }}>
            <div style={{ fontSize: 40 }}>🏓</div>
            הטורניר עדיין בהרשמה.<br />הקטגוריות, הבתים והמשחקים יופיעו כאן ברגע שהמנהל יבנה אותם.
          </div>
        )}

        {!loading && cats.map(c => {
          const inCat = people.filter(p => p.category_id === c.id);
          return (
            <div key={c.id} style={{ ...ppCard, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b style={{ fontSize: 17, color: PP.orange }}>{c.name}</b>
                <span style={{ fontSize: 12, color: PP.dim }}>{genderHe(c.gender)} · {inCat.length} משתתפים</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {inCat.map(p => (
                  <span key={p.id} style={{ background: '#0e1626', border: `1px solid ${PP.line}`, borderRadius: 999, padding: '5px 12px', fontSize: 13 }}>{p.full_name}</span>
                ))}
                {inCat.length === 0 && <span style={{ color: PP.dim, fontSize: 13 }}>אין משתתפים עדיין</span>}
              </div>
            </div>
          );
        })}

        {!loading && cats.length > 0 && uncategorized.length > 0 && (
          <div style={{ ...ppCard, marginBottom: 12, opacity: 0.8 }}>
            <b style={{ fontSize: 15, color: PP.dim }}>טרם שובצו לקטגוריה ({uncategorized.length})</b>
          </div>
        )}
      </div>
    </div>
  );
}
