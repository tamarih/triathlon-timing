import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { genderHe, type TTCategory, type TTParticipant, type TTGroup, type TTMatch } from '../../lib/pingpong';
import { computeStandings } from '../../lib/ppEngine';
import { PP, ppPage, ppWrap, ppCard } from './theme';
import BracketView from './BracketView';

function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = ['#ff7a18', '#d6002a', '#16a34a', '#1557b0', '#eab308', '#ffffff'];
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}>
      <style>{`@keyframes ppfall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:.9}}`}</style>
      {pieces.map((_, i) => (
        <span key={i} style={{
          position: 'absolute', top: '-10vh', left: `${(i * 2.5) % 100}%`,
          width: 9, height: 14, background: colors[i % colors.length], borderRadius: 2,
          animation: `ppfall ${3 + (i % 5) * 0.6}s linear ${(i % 10) * 0.3}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function PPTournament() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<TTCategory[]>([]);
  const [parts, setParts] = useState<TTParticipant[]>([]);
  const [groups, setGroups] = useState<TTGroup[]>([]);
  const [matches, setMatches] = useState<TTMatch[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: c }, { data: p }, { data: g }, { data: m }] = await Promise.all([
      supabase.from('tt_categories').select('*').order('sort'),
      supabase.from('tt_participants').select('*').order('full_name'),
      supabase.from('tt_groups').select('*').order('sort'),
      supabase.from('tt_matches').select('*'),
    ]);
    setCats((c || []) as TTCategory[]); setParts((p || []) as TTParticipant[]);
    setGroups((g || []) as TTGroup[]); setMatches((m || []) as TTMatch[]);
    setLoading(false);
  }
  useEffect(() => { load(); const iv = setInterval(load, 20000); return () => clearInterval(iv); }, []);

  const byId: Record<string, TTParticipant> = {};
  for (const p of parts) byId[p.id] = p;
  const name = (id?: string | null) => (id && byId[id]?.full_name) || '—';
  const champions = cats.map(c => {
    const fin = matches.find(m => m.category_id === c.id && m.stage === 'final' && m.status === 'done' && m.winner_id);
    return fin ? { cat: c, champ: byId[fin.winner_id!] } : null;
  }).filter(Boolean) as { cat: TTCategory; champ: TTParticipant }[];

  const anyGroups = groups.length > 0;

  return (
    <div style={ppPage}>
      {champions.length > 0 && <Confetti />}
      <div style={{ ...ppWrap, position: 'relative', zIndex: 10 }}>
        <button onClick={() => navigate('/pingpong')} style={{ background: 'none', border: 'none', color: PP.dim, cursor: 'pointer', fontSize: 14, padding: '10px 0' }}>← חזרה</button>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 16px' }}>👀 הטורניר</h1>

        {loading && <div style={{ ...ppCard, textAlign: 'center', color: PP.dim }}>טוען...</div>}

        {/* Champions */}
        {champions.map(({ cat, champ }) => (
          <div key={cat.id} style={{ ...ppCard, textAlign: 'center', borderColor: PP.orange, background: 'linear-gradient(160deg,rgba(255,122,24,0.2),rgba(214,0,42,0.12))', marginBottom: 12 }}>
            <div style={{ fontSize: 40 }}>🏆</div>
            <div style={{ fontSize: 13, color: PP.dim }}>אלוף/ת {cat.name}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: PP.orange }}>{champ.full_name}</div>
          </div>
        ))}

        {!loading && !anyGroups && cats.length === 0 && (
          <div style={{ ...ppCard, textAlign: 'center', color: PP.dim, lineHeight: 1.7 }}>
            <div style={{ fontSize: 40 }}>🏓</div>
            הטורניר עדיין בהרשמה.<br />הקטגוריות, הבתים והמשחקים יופיעו כאן ברגע שהמנהל יבנה אותם.
          </div>
        )}

        {/* Per-category: groups + standings + bracket */}
        {!loading && cats.map(c => {
          const cg = groups.filter(g => g.category_id === c.id);
          const cp = parts.filter(p => p.category_id === c.id);
          const gMatches = matches.filter(m => m.category_id === c.id && m.stage === 'group');
          const ko = matches.filter(m => m.category_id === c.id && m.stage !== 'group');
          if (cg.length === 0 && cp.length === 0) return null;
          return (
            <div key={c.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '6px 2px 10px' }}>
                <b style={{ fontSize: 18, color: PP.orange }}>{c.name}</b>
                <span style={{ fontSize: 12, color: PP.dim }}>{genderHe(c.gender)} · {cp.length} משתתפים</span>
              </div>

              {cg.length === 0 && (
                <div style={{ ...ppCard, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {cp.map(p => <span key={p.id} style={{ background: '#0e1626', border: `1px solid ${PP.line}`, borderRadius: 999, padding: '5px 12px', fontSize: 13 }}>{p.full_name}</span>)}
                </div>
              )}

              {/* Groups */}
              {cg.map(g => {
                const mem = cp.filter(p => p.group_id === g.id);
                const st = computeStandings(mem, gMatches.filter(m => m.group_id === g.id));
                const gm = gMatches.filter(m => m.group_id === g.id).sort((a, b) => a.slot - b.slot);
                return (
                  <div key={g.id} style={{ ...ppCard, marginBottom: 10 }}>
                    <div style={{ fontWeight: 900, color: PP.text, marginBottom: 6 }}>בית {g.name}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                      <thead><tr>{['#', 'שם', 'נ', 'ה'].map(h => <th key={h} style={{ textAlign: 'right', color: PP.dim, fontSize: 11, padding: '3px 6px' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {st.map((s, i) => (
                          <tr key={s.participant.id}>
                            <td style={{ padding: '3px 6px', color: PP.dim, fontWeight: 800 }}>{i + 1}</td>
                            <td style={{ padding: '3px 6px', fontWeight: 700 }}>{s.participant.full_name}</td>
                            <td style={{ padding: '3px 6px' }}>{s.wins}</td>
                            <td style={{ padding: '3px 6px' }}>{s.losses}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {gm.map(m => {
                        const done = m.status === 'done';
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <span style={{ flex: 1, textAlign: 'center', fontWeight: done && m.winner_id === m.player1_id ? 800 : 500, color: done && m.winner_id === m.player1_id ? '#bbf7d0' : PP.text }}>{name(m.player1_id)}</span>
                            <span style={{ fontSize: 10, color: PP.dim }}>{done && m.score && m.score !== 'bye' ? m.score : '🆚'}</span>
                            <span style={{ flex: 1, textAlign: 'center', fontWeight: done && m.winner_id === m.player2_id ? 800 : 500, color: done && m.winner_id === m.player2_id ? '#bbf7d0' : PP.text }}>{name(m.player2_id)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Bracket */}
              {ko.length > 0 && (
                <div style={ppCard}>
                  <div style={{ fontWeight: 900, color: PP.text, marginBottom: 8 }}>🏆 שלב ההכרעה</div>
                  <BracketView matches={ko} byId={byId} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
