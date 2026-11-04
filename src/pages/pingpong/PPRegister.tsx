import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PP, ppPage, ppWrap, ppCard, ppInput, ppLabel, ppBtn } from './theme';

export default function PPRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', gender: '', age: '', phone: '', has_table: null as null | boolean });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const pick = (bg: string, active: boolean): React.CSSProperties => ({
    flex: 1, padding: '13px 8px', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer',
    border: `2px solid ${active ? bg : PP.line}`, background: active ? bg : '#0e1626',
    color: active ? 'white' : PP.text, textAlign: 'center',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const name = form.full_name.trim();
    if (!name) { setErr('נא למלא שם מלא'); return; }
    if (!form.gender) { setErr('נא לבחור מין'); return; }
    const age = parseInt(form.age, 10);
    if (!age || age < 4 || age > 100) { setErr('נא למלא גיל תקין'); return; }
    if (form.has_table === null) { setErr('נא לענות על שאלת השולחן'); return; }
    setSaving(true);
    // Prevent obvious duplicates (same name + age).
    const { data: dup } = await supabase.from('tt_participants').select('id')
      .ilike('full_name', name).eq('age', age).limit(1);
    if (dup && dup.length > 0) { setErr('נראה שכבר נרשמת לטורניר 🙂 אם זו טעות, פנו למנהל הטורניר.'); setSaving(false); return; }
    const { error } = await supabase.from('tt_participants').insert({
      full_name: name, gender: form.gender, age,
      phone: form.phone.trim() || null,
      has_table: form.has_table,
      table_status: form.has_table ? 'pending' : null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div style={ppPage}>
        <div style={{ ...ppWrap, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 72 }}>🎉</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '10px 0' }}>נרשמת בהצלחה לטורניר!</h1>
          <p style={{ fontSize: 18, color: PP.dim }}>נתראה ליד השולחן 🏓</p>
          {form.has_table && (
            <div style={{ ...ppCard, marginTop: 20, textAlign: 'right', borderColor: 'rgba(22,163,74,0.5)' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>מעולה, תודה! 🙏</div>
              <div style={{ color: PP.dim, fontSize: 14, lineHeight: 1.6 }}>צוות המארגנים ידאג לתיאום ולשינוע השולחן לבית העם ובחזרה.</div>
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <Link to="/pingpong" style={ppBtn('linear-gradient(135deg,#ff7a18,#d6002a)')}>חזרה לדף הטורניר</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={ppPage}>
      <div style={ppWrap}>
        <button onClick={() => navigate('/pingpong')} style={{ background: 'none', border: 'none', color: PP.dim, cursor: 'pointer', fontSize: 14, padding: '8px 0' }}>← חזרה</button>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '4px 0 18px' }}>🏓 הרשמה לטורניר</h1>
        <form onSubmit={submit} style={ppCard}>
          <label style={ppLabel}>שם מלא *</label>
          <input style={ppInput} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="שם פרטי ושם משפחה" />

          <label style={ppLabel}>מין *</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div onClick={() => setForm({ ...form, gender: 'male' })} style={pick(PP.blue, form.gender === 'male')}>👦 זכר</div>
            <div onClick={() => setForm({ ...form, gender: 'female' })} style={pick('#db2777', form.gender === 'female')}>👧 נקבה</div>
          </div>

          <label style={ppLabel}>גיל *</label>
          <input style={ppInput} type="number" min={4} max={100} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="לדוגמה: 14" />

          <label style={ppLabel}>טלפון (לא חובה — לתיאום)</label>
          <input style={ppInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05X-XXXXXXX" />

          <label style={ppLabel}>האם יש לך שולחן טניס שולחן להשאלה לטובת הטורניר? *</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <div onClick={() => setForm({ ...form, has_table: true })} style={pick(PP.green, form.has_table === true)}>✅ כן</div>
            <div onClick={() => setForm({ ...form, has_table: false })} style={pick('#6b7280', form.has_table === false)}>❌ לא</div>
          </div>
          {form.has_table === true && (
            <div style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.4)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#bbf7d0', marginBottom: 8, lineHeight: 1.5 }}>
              מעולה, תודה! 🙏 צוות המארגנים ידאג לתיאום ולשינוע השולחן לבית העם ובחזרה.
            </div>
          )}

          {err && <div style={{ color: '#fca5a5', fontSize: 14, fontWeight: 700, margin: '6px 0 10px' }}>{err}</div>}

          <button type="submit" disabled={saving} style={{ ...ppBtn('linear-gradient(135deg,#ff7a18,#d6002a)'), marginTop: 8, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'שומר...' : '🎉 סיום הרשמה'}
          </button>
        </form>
      </div>
    </div>
  );
}
