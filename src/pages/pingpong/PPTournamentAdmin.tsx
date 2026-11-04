import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { genderHe, type TTCategory, type TTParticipant, type TTGroup, type TTMatch } from '../../lib/pingpong';
import { generateGroups, generateKnockout, recordResult, clearResult, computeStandings } from '../../lib/ppEngine';
import { PP, ppCard } from './theme';
import BracketView from './BracketView';

const btn = (bg: string): React.CSSProperties => ({ background: bg, color: 'white', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer' });

export default function PPTournamentAdmin() {
  const [cats, setCats] = useState<TTCategory[]>([]);
  const [parts, setParts] = useState<TTParticipant[]>([]);
  const [groups, setGroups] = useState<TTGroup[]>([]);
  const [matches, setMatches] = useState<TTMatch[]>([]);
  const [sel, setSel] = useState('');
  const [groupSize, setGroupSize] = useState('4');
  const [advancers, setAdvancers] = useState('2');
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    const [{ data: c }, { data: p }, { data: g }, { data: m }] = await Promise.all([
      supabase.from('tt_categories').select('*').order('sort'),
      supabase.from('tt_participants').select('*').order('full_name'),
      supabase.from('tt_groups').select('*').order('sort'),
      supabase.from('tt_matches').select('*'),
    ]);
    setCats((c || []) as TTCategory[]); setParts((p || []) as TTParticipant[]);
    setGroups((g || []) as TTGroup[]); setMatches((m || []) as TTMatch[]);
    if (!sel && c && c.length) setSel((c[0] as TTCategory).id);
  }
  useEffect(() => { loadAll(); }, []);

  const byId: Record<string, TTParticipant> = {};
  for (const p of parts) byId[p.id] = p;
  const catGroups = groups.filter(g => g.category_id === sel);
  const catParts = parts.filter(p => p.category_id === sel);
  const groupMatches = matches.filter(m => m.category_id === sel && m.stage === 'group');
  const koMatches = matches.filter(m => m.category_id === sel && m.stage !== 'group');
  const finalM = koMatches.find(m => m.stage === 'final');
  const champion = finalM?.status === 'done' && finalM.winner_id ? byId[finalM.winner_id] : null;

  async function run(fn: () => Promise<void>) { setBusy(true); try { await fn(); await loadAll(); } catch (e: any) { alert(e.message || 'שגיאה'); } finally { setBusy(false); } }

  async function doGroups() {
    if (catParts.length < 2) { alert('צריך לפחות 2 משתתפים בקטגוריה'); return; }
    if (catGroups.length && !confirm('יצירת בתים מחדש תמחק את הבתים והמשחקים הקיימים בקטגוריה. להמשיך?')) return;
    await run(() => generateGroups(sel, catParts, parseInt(groupSize) || 4));
  }
  async function doKnockout() {
    if (koMatches.length && !confirm('יצירת שלב נוקאאוט מחדש תמחק את ה-Bracket הקיים בקטגוריה. להמשיך?')) return;
    await run(() => generateKnockout(sel, catGroups, catParts, groupMatches, parseInt(advancers) || 2));
  }
  async function pick(m: TTMatch, winnerId: string, withScore: boolean) {
    if (m.status === 'done' && m.winner_id !== winnerId && !confirm('שינוי תוצאה עשוי להשפיע על המשך הטורניר. להמשיך?')) return;
    let score: string | null = m.score || null;
    if (withScore) { const s = prompt('תוצאה (לא חובה), למשל 3-1', m.score && m.score !== 'bye' ? m.score : ''); if (s !== null) score = s || null; }
    await run(() => recordResult(m, winnerId, score));
  }
  async function undo(m: TTMatch) { if (confirm('לבטל את התוצאה?')) await run(() => clearResult(m)); }
  async function moveTo(pid: string, gid: string) {
    if (!confirm('העברת משתתף לבית אחר לא מעדכנת אוטומטית את המשחקים הקיימים. מומלץ לאחר מכן ליצור בתים/משחקים מחדש. להמשיך?')) return;
    await run(async () => { await supabase.from('tt_participants').update({ group_id: gid }).eq('id', pid); });
  }

  const sizeInput: React.CSSProperties = { width: 50, background: '#0e1626', color: PP.text, border: `1px solid ${PP.line}`, borderRadius: 8, padding: '6px', fontSize: 13, textAlign: 'center' };

  return (
    <div>
      {/* Category selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setSel(c.id)} style={{ ...btn(sel === c.id ? PP.blue : 'rgba(255,255,255,0.07)'), whiteSpace: 'nowrap' }}>{c.name}</button>
        ))}
        {cats.length === 0 && <div style={{ color: PP.dim, fontSize: 13 }}>אין קטגוריות. צרו קטגוריות בלשונית "קטגוריות".</div>}
      </div>

      {sel && (
        <>
          {champion && (
            <div style={{ ...ppCard, textAlign: 'center', borderColor: PP.orange, background: 'linear-gradient(160deg,rgba(255,122,24,0.18),rgba(214,0,42,0.12))', marginBottom: 14 }}>
              <div style={{ fontSize: 34 }}>🏆</div>
              <div style={{ fontSize: 14, color: PP.dim }}>אלוף/ת הקטגוריה</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: PP.orange }}>{champion.full_name}</div>
            </div>
          )}

          {/* Controls */}
          <div style={{ ...ppCard, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: PP.dim }}>משתתפים בקטגוריה: <b style={{ color: PP.text }}>{catParts.length}</b></span>
            <span style={{ width: 1, height: 20, background: PP.line }} />
            <span style={{ fontSize: 13 }}>גודל בית:</span>
            <input style={sizeInput} type="number" min={2} max={8} value={groupSize} onChange={e => setGroupSize(e.target.value)} />
            <button onClick={doGroups} disabled={busy} style={btn('linear-gradient(135deg,#ff7a18,#d6002a)')}>🏗️ {catGroups.length ? 'צור בתים מחדש' : 'צור בתים'}</button>
            {catGroups.length > 0 && <>
              <span style={{ width: 1, height: 20, background: PP.line }} />
              <span style={{ fontSize: 13 }}>עולים מכל בית:</span>
              <input style={sizeInput} type="number" min={1} max={4} value={advancers} onChange={e => setAdvancers(e.target.value)} />
              <button onClick={doKnockout} disabled={busy} style={btn(PP.green)}>🏆 {koMatches.length ? 'צור נוקאאוט מחדש' : 'צור שלב נוקאאוט'}</button>
            </>}
          </div>

          {/* Groups + standings + results */}
          {catGroups.length > 0 && (
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {catGroups.map(g => {
                const mem = catParts.filter(p => p.group_id === g.id);
                const st = computeStandings(mem, groupMatches.filter(m => m.group_id === g.id));
                const gm = groupMatches.filter(m => m.group_id === g.id).sort((a, b) => a.slot - b.slot);
                return (
                  <div key={g.id} style={ppCard}>
                    <div style={{ fontWeight: 900, color: PP.orange, marginBottom: 8 }}>בית {g.name}</div>
                    {/* standings */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 10 }}>
                      <thead><tr>{['#', 'שם', 'נ', 'ה', 'בית'].map(h => <th key={h} style={{ textAlign: 'right', color: PP.dim, fontSize: 11, padding: '3px 6px' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {st.map((s, i) => (
                          <tr key={s.participant.id}>
                            <td style={{ padding: '3px 6px', color: i < parseInt(advancers) ? PP.green : PP.dim, fontWeight: 800 }}>{i + 1}</td>
                            <td style={{ padding: '3px 6px', fontWeight: 700 }}>{s.participant.full_name}</td>
                            <td style={{ padding: '3px 6px' }}>{s.wins}</td>
                            <td style={{ padding: '3px 6px' }}>{s.losses}</td>
                            <td style={{ padding: '3px 6px' }}>
                              <select value={g.id} onChange={e => moveTo(s.participant.id, e.target.value)} style={{ background: '#0e1626', color: PP.dim, border: `1px solid ${PP.line}`, borderRadius: 6, fontSize: 11, padding: '2px' }}>
                                {catGroups.map(gg => <option key={gg.id} value={gg.id}>{gg.name}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* matches */}
                    <div style={{ display: 'grid', gap: 6 }}>
                      {gm.map(m => <MatchRow key={m.id} m={m} byId={byId} onPick={pick} onUndo={undo} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Knockout bracket */}
          {koMatches.length > 0 && (
            <div style={ppCard}>
              <div style={{ fontWeight: 900, color: PP.orange, marginBottom: 10 }}>🏆 שלב ההכרעה</div>
              <BracketView matches={koMatches} byId={byId} onPick={(m, w) => pick(m, w, true)} />
              <div style={{ fontSize: 12, color: PP.dim, marginTop: 8 }}>לחיצה על שם שחקן קובעת אותו כמנצח (ומקדמת אותו אוטומטית לשלב הבא).</div>
            </div>
          )}

          {catGroups.length === 0 && (
            <div style={{ ...ppCard, textAlign: 'center', color: PP.dim, lineHeight: 1.7 }}>
              <div style={{ fontSize: 34 }}>🏓</div>
              עדיין אין בתים בקטגוריה <b style={{ color: PP.text }}>{cats.find(c => c.id === sel)?.name}</b> ({genderHe(cats.find(c => c.id === sel)?.gender || '')}).<br />
              קבעו גודל בית ולחצו "צור בתים".
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchRow({ m, byId, onPick, onUndo }: { m: TTMatch; byId: Record<string, TTParticipant>; onPick: (m: TTMatch, w: string, s: boolean) => void; onUndo: (m: TTMatch) => void }) {
  const name = (id?: string | null) => (id && byId[id]?.full_name) || '—';
  const done = m.status === 'done';
  const chip = (pid?: string | null): React.CSSProperties => ({
    flex: 1, textAlign: 'center', padding: '7px 6px', borderRadius: 8, fontSize: 13, cursor: pid ? 'pointer' : 'default',
    fontWeight: done && m.winner_id === pid ? 800 : 600,
    background: done && m.winner_id === pid ? 'rgba(22,163,74,0.25)' : '#0e1626',
    color: done && m.winner_id === pid ? '#bbf7d0' : PP.text,
    border: `1px solid ${PP.line}`,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div onClick={() => m.player1_id && onPick(m, m.player1_id, true)} style={chip(m.player1_id)}>{name(m.player1_id)}</div>
      <span style={{ fontSize: 11, color: PP.dim }}>🆚</span>
      <div onClick={() => m.player2_id && onPick(m, m.player2_id, true)} style={chip(m.player2_id)}>{name(m.player2_id)}</div>
      {done ? <button onClick={() => onUndo(m)} title="בטל תוצאה" style={{ ...btn('rgba(255,255,255,0.08)'), padding: '6px 8px' }}>↺</button>
        : <span style={{ width: 30, textAlign: 'center', fontSize: 11, color: PP.dim }}>{m.score && m.score !== 'bye' ? m.score : ''}</span>}
    </div>
  );
}
