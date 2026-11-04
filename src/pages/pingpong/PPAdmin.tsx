import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  verifyAdmin, isAdmin, setAdmin, suggestCategories,
  genderHe, type TTSettings, type TTCategory, type TTParticipant,
} from '../../lib/pingpong';
import { PP, ppPage, ppWrap, ppCard, ppInput, ppLabel } from './theme';
import PPTournamentAdmin from './PPTournamentAdmin';

const btn = (bg: string): React.CSSProperties => ({ background: bg, color: 'white', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer' });
const th: React.CSSProperties = { textAlign: 'right', padding: '9px 10px', fontSize: 12, color: PP.dim, fontWeight: 700, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderTop: `1px solid ${PP.line}`, whiteSpace: 'nowrap' };
const sel: React.CSSProperties = { background: '#0e1626', color: PP.text, border: `1px solid ${PP.line}`, borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'system-ui' };
const TABS = ['לוח בקרה', 'משתתפים', 'קטגוריות', 'טורניר', 'שולחנות', 'הגדרות'] as const;

export default function PPAdmin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(isAdmin());
  const [code, setCode] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState<typeof TABS[number]>('לוח בקרה');

  const [settings, setSettings] = useState<TTSettings | null>(null);
  const [participants, setParticipants] = useState<TTParticipant[]>([]);
  const [categories, setCategories] = useState<TTCategory[]>([]);
  const [edit, setEdit] = useState<TTParticipant | null>(null);
  const [suggested, setSuggested] = useState<Omit<TTCategory, 'id'>[] | null>(null);

  async function loadAll() {
    const [{ data: s }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('tt_settings').select('*').eq('id', 1).single(),
      supabase.from('tt_participants').select('*').order('created_at'),
      supabase.from('tt_categories').select('*').order('sort'),
    ]);
    setSettings(s as TTSettings);
    setParticipants((p || []) as TTParticipant[]);
    setCategories((c || []) as TTCategory[]);
  }
  useEffect(() => { if (authed) loadAll(); }, [authed]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr('');
    const ok = await verifyAdmin(code.trim());
    if (ok) { setAdmin(true); setAuthed(true); } else setLoginErr('קוד שגוי');
  }

  // ---- Login screen ----
  if (!authed) {
    return (
      <div style={ppPage}>
        <div style={{ ...ppWrap, maxWidth: 380, paddingTop: 70 }}>
          <div style={{ textAlign: 'center', fontSize: 48 }}>🔐</div>
          <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, margin: '6px 0 20px' }}>כניסת מנהל</h1>
          <form onSubmit={doLogin} style={ppCard}>
            <label style={ppLabel}>קוד מנהל</label>
            <input style={ppInput} type="password" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} placeholder="••••" autoFocus />
            {loginErr && <div style={{ color: '#fca5a5', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{loginErr}</div>}
            <button type="submit" style={{ ...btn('linear-gradient(135deg,#ff7a18,#d6002a)'), width: '100%', padding: '13px', fontSize: 16 }}>כניסה</button>
          </form>
          <button onClick={() => navigate('/pingpong')} style={{ background: 'none', border: 'none', color: PP.dim, cursor: 'pointer', fontSize: 13, display: 'block', margin: '16px auto 0' }}>← חזרה לטורניר</button>
        </div>
      </div>
    );
  }

  const males = participants.filter(p => p.gender === 'male').length;
  const females = participants.filter(p => p.gender === 'female').length;
  const tables = participants.filter(p => p.has_table).length;
  const catName = (id?: string | null) => categories.find(c => c.id === id)?.name || '—';

  async function patch(id: string, fields: Partial<TTParticipant>) {
    await supabase.from('tt_participants').update(fields).eq('id', id);
    loadAll();
  }
  async function del(id: string) {
    if (!confirm('למחוק את המשתתף? פעולה זו אינה הפיכה.')) return;
    await supabase.from('tt_participants').delete().eq('id', id);
    loadAll();
  }
  async function saveEdit() {
    if (!edit) return;
    await supabase.from('tt_participants').update({
      full_name: edit.full_name, gender: edit.gender, age: edit.age,
      phone: edit.phone || null, has_table: edit.has_table,
      table_status: edit.has_table ? (edit.table_status || 'pending') : null,
      category_id: edit.category_id || null,
    }).eq('id', edit.id);
    setEdit(null); loadAll();
  }

  async function saveSuggested() {
    if (!suggested) return;
    await supabase.from('tt_categories').insert(suggested);
    setSuggested(null); loadAll();
  }
  async function autoAssign() {
    for (const p of participants) {
      const cat = categories.find(c => (c.gender === p.gender || c.gender === 'mixed') && p.age >= c.min_age && p.age <= c.max_age);
      if (cat && p.category_id !== cat.id) await supabase.from('tt_participants').update({ category_id: cat.id }).eq('id', p.id);
    }
    loadAll();
  }
  async function addCategory() {
    await supabase.from('tt_categories').insert({ name: 'קטגוריה חדשה', gender: 'male', min_age: 0, max_age: 120, sort: categories.length });
    loadAll();
  }
  async function patchCat(id: string, fields: Partial<TTCategory>) {
    await supabase.from('tt_categories').update(fields).eq('id', id); loadAll();
  }
  async function delCat(id: string) {
    if (!confirm('למחוק את הקטגוריה? המשתתפים בה יישארו ללא קטגוריה.')) return;
    await supabase.from('tt_categories').delete().eq('id', id); loadAll();
  }
  async function saveSettings(fields: Partial<TTSettings>) {
    await supabase.from('tt_settings').update(fields).eq('id', 1);
    setSettings(s => s ? { ...s, ...fields } as TTSettings : s);
  }

  return (
    <div style={ppPage}>
      <div style={{ ...ppWrap, maxWidth: 940 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>🏓 ניהול הטורניר</h1>
          <button onClick={() => { setAdmin(false); setAuthed(false); }} style={btn('rgba(255,255,255,0.1)')}>יציאה</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '14px 0 16px', paddingBottom: 4 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...btn(tab === t ? 'linear-gradient(135deg,#ff7a18,#d6002a)' : 'rgba(255,255,255,0.07)'), whiteSpace: 'nowrap' }}>{t}</button>
          ))}
        </div>

        {/* ---- Dashboard ---- */}
        {tab === 'לוח בקרה' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { icon: '👥', label: 'סה"כ נרשמים', val: participants.length, c: PP.orange },
                { icon: '👨', label: 'גברים', val: males, c: PP.blue },
                { icon: '👩', label: 'נשים', val: females, c: '#db2777' },
                { icon: '🏓', label: 'מספקי שולחן', val: tables, c: PP.green },
                { icon: '🎮', label: 'משחקים', val: 0, c: '#a855f7' },
                { icon: '🏆', label: 'סטטוס', val: settings?.status === 'registration' ? 'הרשמה' : settings?.status === 'groups' ? 'בתים' : settings?.status === 'knockout' ? 'נוקאאוט' : 'הסתיים', c: '#eab308', small: true },
              ].map(k => (
                <div key={k.label} style={{ ...ppCard, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>{k.icon}</div>
                  <div style={{ fontSize: k.small ? 18 : 28, fontWeight: 900, color: k.c, marginTop: 2 }}>{k.val}</div>
                  <div style={{ fontSize: 12, color: PP.dim, fontWeight: 700 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{ ...ppCard, color: PP.dim, fontSize: 13, lineHeight: 1.7 }}>
              <b style={{ color: PP.text }}>השלב הבא:</b> לאחר שההרשמה נסגרת — בלשונית <b style={{ color: PP.text }}>קטגוריות</b> אפשר לקבל חלוקה מומלצת לקטגוריות לפי מין וגיל, ולשבץ את המשתתפים.
              מנוע הבתים, המשחקים וה-Bracket יתווסף בשלב הבא. 🏓
            </div>
          </>
        )}

        {/* ---- Participants ---- */}
        {tab === 'משתתפים' && (
          <div style={{ ...ppCard, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead><tr>
                {['שם', 'מין', 'גיל', 'שולחן', 'קטגוריה', ''].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{p.full_name}</td>
                    <td style={td}>{p.gender === 'male' ? '👦' : '👧'}</td>
                    <td style={td}>{p.age}</td>
                    <td style={td}>{p.has_table ? '✅' : '—'}</td>
                    <td style={td}>
                      <select style={sel} value={p.category_id || ''} onChange={e => patch(p.id, { category_id: e.target.value || null })}>
                        <option value="">—</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEdit(p)} style={btn('rgba(255,255,255,0.1)')}>✏️</button>
                        <button onClick={() => del(p.id)} style={btn('#7f1d1d')}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: PP.dim, padding: 30 }}>עדיין אין נרשמים 🏓</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Categories ---- */}
        {tab === 'קטגוריות' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button onClick={() => setSuggested(suggestCategories(participants))} style={btn('linear-gradient(135deg,#ff7a18,#d6002a)')}>✨ הצע חלוקה לקטגוריות</button>
              <button onClick={autoAssign} style={btn(PP.blue)} disabled={categories.length === 0}>🎯 שבץ משתתפים אוטומטית</button>
              <button onClick={addCategory} style={btn('rgba(255,255,255,0.1)')}>➕ קטגוריה ידנית</button>
            </div>

            {suggested && (
              <div style={{ ...ppCard, marginBottom: 14, borderColor: PP.orange }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>הצעת חלוקה ({suggested.length} קטגוריות):</div>
                {suggested.map((c, i) => <div key={i} style={{ fontSize: 14, color: PP.dim, padding: '2px 0' }}>• {c.name} <span style={{ opacity: 0.6 }}>(גיל {c.min_age}–{c.max_age === 120 ? '∞' : c.max_age})</span></div>)}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={saveSuggested} style={btn(PP.green)}>✅ אשר ושמור</button>
                  <button onClick={() => setSuggested(null)} style={btn('rgba(255,255,255,0.1)')}>ביטול</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {categories.map(c => {
                const n = participants.filter(p => p.category_id === c.id).length;
                return (
                  <div key={c.id} style={{ ...ppCard, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input style={{ ...ppInput, margin: 0, flex: '2 1 150px', padding: '8px 10px' }} value={c.name} onChange={e => setCategories(cs => cs.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} onBlur={e => patchCat(c.id, { name: e.target.value })} />
                      <select style={sel} value={c.gender} onChange={e => patchCat(c.id, { gender: e.target.value as any })}>
                        <option value="male">גברים</option><option value="female">נשים</option><option value="mixed">מעורב</option>
                      </select>
                      <input style={{ ...sel, width: 52 }} type="number" value={c.min_age} onChange={e => patchCat(c.id, { min_age: parseInt(e.target.value) || 0 })} title="גיל מינימום" />
                      <span style={{ color: PP.dim }}>–</span>
                      <input style={{ ...sel, width: 52 }} type="number" value={c.max_age} onChange={e => patchCat(c.id, { max_age: parseInt(e.target.value) || 120 })} title="גיל מקסימום" />
                      <span style={{ fontSize: 12, color: PP.orange, fontWeight: 800 }}>{n} 👤</span>
                      <button onClick={() => delCat(c.id)} style={{ ...btn('#7f1d1d'), marginRight: 'auto' }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && <div style={{ ...ppCard, textAlign: 'center', color: PP.dim }}>אין קטגוריות עדיין. לחצו "הצע חלוקה" או הוסיפו ידנית.</div>}
            </div>
          </>
        )}

        {/* ---- Tournament (groups, matches, bracket) ---- */}
        {tab === 'טורניר' && <PPTournamentAdmin />}

        {/* ---- Tables ---- */}
        {tab === 'שולחנות' && (
          <div style={{ ...ppCard, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead><tr>{['שם', 'טלפון', 'סטטוס שולחן'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {participants.filter(p => p.has_table).map(p => (
                  <tr key={p.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{p.full_name}</td>
                    <td style={{ ...td, direction: 'ltr', textAlign: 'right', fontFamily: 'monospace' }}>{p.phone || '—'}</td>
                    <td style={td}>
                      <select style={sel} value={p.table_status || 'pending'} onChange={e => patch(p.id, { table_status: e.target.value as any })}>
                        <option value="pending">טרם תואם</option>
                        <option value="matched">תואם</option>
                        <option value="collected">נאסף</option>
                        <option value="arrived">הגיע לבית העם</option>
                        <option value="returned">הוחזר</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {participants.filter(p => p.has_table).length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: PP.dim, padding: 30 }}>אף אחד עדיין לא סימן שיש לו שולחן 🏓</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Settings ---- */}
        {tab === 'הגדרות' && settings && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={ppCard}>
              <label style={ppLabel}>שם הטורניר</label>
              <input style={ppInput} value={settings.tournament_name} onChange={e => setSettings({ ...settings, tournament_name: e.target.value })} onBlur={e => saveSettings({ tournament_name: e.target.value })} />
              <label style={ppLabel}>תאריך האירוע</label>
              <input style={ppInput} type="date" value={settings.event_date} onChange={e => saveSettings({ event_date: e.target.value })} />
              <label style={ppLabel}>מיקום</label>
              <input style={ppInput} value={settings.location} onChange={e => setSettings({ ...settings, location: e.target.value })} onBlur={e => saveSettings({ location: e.target.value })} />
              <label style={ppLabel}>טקסט פתיחה באתר</label>
              <textarea style={{ ...ppInput, minHeight: 80 }} value={settings.intro_text} onChange={e => setSettings({ ...settings, intro_text: e.target.value })} onBlur={e => saveSettings({ intro_text: e.target.value })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={settings.registration_open} onChange={e => saveSettings({ registration_open: e.target.checked })} />
                <span>ההרשמה פתוחה</span>
              </label>
            </div>
            <ChangeCode />
          </div>
        )}
      </div>

      {/* ---- Edit participant modal ---- */}
      {edit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto', zIndex: 50, direction: 'rtl' }}>
          <div style={{ ...ppCard, width: '100%', maxWidth: 440, marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <b style={{ fontSize: 17 }}>עריכת משתתף</b>
              <button onClick={() => setEdit(null)} style={{ background: 'none', border: 'none', color: PP.dim, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <label style={ppLabel}>שם מלא</label>
            <input style={ppInput} value={edit.full_name} onChange={e => setEdit({ ...edit, full_name: e.target.value })} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={ppLabel}>מין</label>
                <select style={{ ...ppInput, padding: '12px' }} value={edit.gender} onChange={e => setEdit({ ...edit, gender: e.target.value as any })}>
                  <option value="male">זכר</option><option value="female">נקבה</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={ppLabel}>גיל</label>
                <input style={ppInput} type="number" value={edit.age} onChange={e => setEdit({ ...edit, age: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <label style={ppLabel}>טלפון</label>
            <input style={ppInput} value={edit.phone || ''} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
            <label style={ppLabel}>קטגוריה</label>
            <select style={{ ...ppInput, padding: '12px' }} value={edit.category_id || ''} onChange={e => setEdit({ ...edit, category_id: e.target.value || null })}>
              <option value="">— ללא —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({genderHe(c.gender)})</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: '4px 0 14px' }}>
              <input type="checkbox" checked={edit.has_table} onChange={e => setEdit({ ...edit, has_table: e.target.checked })} />
              <span>מספק שולחן לטורניר</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} style={{ ...btn('linear-gradient(135deg,#ff7a18,#d6002a)'), flex: 1, padding: '12px' }}>שמירה</button>
              <button onClick={() => setEdit(null)} style={{ ...btn('rgba(255,255,255,0.1)'), flex: 1, padding: '12px' }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeCode() {
  const [old, setOld] = useState('');
  const [nw, setNw] = useState('');
  const [msg, setMsg] = useState('');
  async function change() {
    setMsg('');
    if (!old || !nw) { setMsg('נא למלא קוד נוכחי וחדש'); return; }
    const { data, error } = await supabase.rpc('tt_set_admin_code', { p_old: old.trim(), p_new: nw.trim() });
    if (error) { setMsg(error.message); return; }
    if (data === true) { setMsg('✅ הקוד עודכן'); setOld(''); setNw(''); } else setMsg('הקוד הנוכחי שגוי');
  }
  return (
    <div style={ppCard}>
      <b style={{ fontSize: 15 }}>שינוי קוד מנהל</b>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <input style={{ ...ppInput, margin: 0, flex: '1 1 120px' }} type="password" placeholder="קוד נוכחי" value={old} onChange={e => setOld(e.target.value)} />
        <input style={{ ...ppInput, margin: 0, flex: '1 1 120px' }} type="password" placeholder="קוד חדש" value={nw} onChange={e => setNw(e.target.value)} />
        <button onClick={change} style={btn(PP.blue)}>עדכון</button>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith('✅') ? '#86efac' : '#fca5a5', marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
