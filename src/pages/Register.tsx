import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event, Race } from '../lib/types';
import { calculateAge } from '../lib/utils';
import toast from 'react-hot-toast';

type RegType = 'personal' | 'team' | null;

const S = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    padding: '24px 16px 48px',
    direction: 'rtl' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  inner: { maxWidth: 600, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 20, textAlign: 'center' as const },
  card: { background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: '24px 20px', marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const,
    background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  select: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const,
    background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif',
    appearance: 'auto' as const,
  },
  fieldWrap: { marginBottom: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  raceBtn: (selected: boolean): React.CSSProperties => ({
    border: selected ? '2px solid #2563eb' : '2px solid #e5e7eb',
    borderRadius: 14, padding: '14px 12px', textAlign: 'right' as const,
    background: selected ? '#eff6ff' : 'white', cursor: 'pointer',
    width: '100%', transition: 'all 0.15s',
  }),
  raceName: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 },
  raceSub: { fontSize: 12, color: '#6b7280' },
  typeBtn: {
    border: '2px solid #e5e7eb', borderRadius: 14, padding: '16px',
    textAlign: 'center' as const, background: 'white', cursor: 'pointer',
    flex: 1, transition: 'all 0.15s',
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 },
  divider: { borderTop: '1px solid #f3f4f6', margin: '16px 0' },
  btnRow: { display: 'flex', gap: 10, marginTop: 20 },
  btnPrimary: {
    flex: 1, background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
    color: 'white', border: 'none', borderRadius: 12,
    padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  btnSecondary: {
    flex: 1, background: 'white', color: '#374151',
    border: '1.5px solid #e5e7eb', borderRadius: 12,
    padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' },
  memberCard: { border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 14 },
  memberTitle: { fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginBottom: 12 },
};

export default function Register() {
  const [params] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(params.get('event') || '');
  const [selectedRace, setSelectedRace] = useState('');
  const [regType, setRegType] = useState<RegType>(null);
  const [step, setStep] = useState<'select' | 'form' | 'success'>('select');
  const [submitting, setSubmitting] = useState(false);
  const [waitlist, setWaitlist] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', id_number: '', birth_date: '',
    gender: 'male', phone: '', email: '', city: '', club: '',
    emergency_contact: '', emergency_phone: '', shirt_size: 'M',
    notes: '', health_declaration: false, rules_accepted: false, photo_consent: false,
  });

  const [teamForm, setTeamForm] = useState({
    name: '', contact_name: '', contact_phone: '', contact_email: '',
    swimmer: { first_name: '', last_name: '', phone: '', birth_date: '', health: false, rules: false },
    cyclist: { first_name: '', last_name: '', phone: '', birth_date: '', health: false, rules: false },
    runner: { first_name: '', last_name: '', phone: '', birth_date: '', health: false, rules: false },
  });

  useEffect(() => {
    supabase.from('events').select('*').eq('status', 'open').order('date').then(({ data }) => setEvents(data || []));
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).eq('is_open', true).then(({ data }) => setRaces(data || []));
  }, [selectedEvent]);

  async function checkCapacity(raceId: string) {
    const race = races.find(r => r.id === raceId);
    if (!race?.max_participants) return { full: false };
    const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('race_id', raceId);
    return { full: (count || 0) >= race.max_participants };
  }

  async function submitPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.health_declaration || !form.rules_accepted) { toast.error('יש לאשר את הצהרת הבריאות והתקנון'); return; }
    setSubmitting(true);
    try {
      const cap = await checkCapacity(selectedRace);
      if (cap.full) { setWaitlist(true); setSubmitting(false); return; }
      const age = form.birth_date ? calculateAge(form.birth_date) : null;
      const { error } = await supabase.from('participants').insert({ event_id: selectedEvent, race_id: selectedRace, ...form, age });
      if (error) throw error;
      setStep('success');
    } catch (err: any) { toast.error(err.message || 'שגיאה בהרשמה'); }
    finally { setSubmitting(false); }
  }

  async function submitWaitlist() {
    setSubmitting(true);
    try {
      await supabase.from('waitlist').insert({ event_id: selectedEvent, race_id: selectedRace, name: `${form.first_name} ${form.last_name}`, phone: form.phone, email: form.email });
      setStep('success');
    } catch (err: any) { toast.error(err.message || 'שגיאה'); }
    finally { setSubmitting(false); }
  }

  async function submitTeam(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: teamData, error: teamErr } = await supabase.from('teams').insert({
        event_id: selectedEvent, race_id: selectedRace, name: teamForm.name,
        contact_name: teamForm.contact_name, contact_phone: teamForm.contact_phone, contact_email: teamForm.contact_email,
      }).select().single();
      if (teamErr) throw teamErr;
      for (const [role, data] of [['swimmer', teamForm.swimmer], ['cyclist', teamForm.cyclist], ['runner', teamForm.runner]] as any[]) {
        const age = data.birth_date ? calculateAge(data.birth_date) : null;
        await supabase.from('participants').insert({ event_id: selectedEvent, race_id: selectedRace, team_id: teamData.id, team_role: role, first_name: data.first_name, last_name: data.last_name, phone: data.phone, birth_date: data.birth_date, gender: 'male', email: teamForm.contact_email, health_declaration: data.health, rules_accepted: data.rules, photo_consent: false, age });
      }
      setStep('success');
    } catch (err: any) { toast.error(err.message || 'שגיאה בהרשמה'); }
    finally { setSubmitting(false); }
  }

  const selectedRaceObj = races.find(r => r.id === selectedRace);

  if (step === 'success') return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...S.card, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{waitlist ? '⏳' : '🎉'}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{waitlist ? 'נרשמת לרשימת המתנה!' : 'ההרשמה הושלמה!'}</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>{waitlist ? 'נעדכן אותך אם יפנה מקום.' : 'ברוכים הבאים לאירוע! 🏊🚴🏃'}</p>
        <Link to="/" style={{ display: 'block', background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', borderRadius: 12, padding: '13px 0', fontWeight: 700, textDecoration: 'none', marginBottom: 8 }}>חזרה לדף הבית</Link>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <h1 style={S.title}>🏁 הרשמה לאירוע</h1>

        {step === 'select' && (
          <div style={S.card}>
            <div style={S.fieldWrap}>
              <label style={S.label}>בחרו אירוע</label>
              <select style={S.select} value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); setSelectedRace(''); setRegType(null); }}>
                <option value="">-- בחרו אירוע --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>

            {selectedEvent && races.length > 0 && (
              <div style={S.fieldWrap}>
                <label style={S.label}>בחרו מקצה</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {races.map(r => (
                    <button key={r.id} onClick={() => setSelectedRace(r.id)} style={S.raceBtn(selectedRace === r.id)}>
                      <div style={S.raceName}>{r.name}</div>
                      <div style={S.raceSub}>{r.type === 'relay' ? 'שליחים' : 'אישי'} · שחייה {r.swim_distance}מ' · אופניים {r.bike_distance}ק"מ · ריצה {r.run_distance}ק"מ</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedRace && (
              <div style={S.fieldWrap}>
                <label style={S.label}>סוג הרשמה</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {selectedRaceObj?.type !== 'relay' && (
                    <button onClick={() => { setRegType('personal'); setStep('form'); }} style={S.typeBtn}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>👤</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>הרשמה אישית</div>
                    </button>
                  )}
                  {selectedRaceObj?.type === 'relay' && (
                    <button onClick={() => { setRegType('team'); setStep('form'); }} style={S.typeBtn}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>👥</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>הרשמה קבוצתית</div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'form' && regType === 'personal' && (
          <div style={S.card}>
            {waitlist ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>המקצה מלא</h3>
                <p style={{ color: '#6b7280', marginBottom: 20 }}>תוכלו להצטרף לרשימת המתנה</p>
                <button onClick={submitWaitlist} disabled={submitting} style={{ ...S.btnPrimary, flex: 'none', padding: '12px 32px' }}>
                  {submitting ? '...' : 'הצטרפות לרשימת המתנה'}
                </button>
              </div>
            ) : (
              <form onSubmit={submitPersonal}>
                <div style={S.sectionTitle}>פרטים אישיים</div>
                <div style={S.grid2}>
                  <Field label="שם פרטי" value={form.first_name} onChange={v => setForm({...form, first_name: v})} required />
                  <Field label="שם משפחה" value={form.last_name} onChange={v => setForm({...form, last_name: v})} required />
                </div>
                <div style={S.grid2}>
                  <Field label='ת"ז' value={form.id_number} onChange={v => setForm({...form, id_number: v})} />
                  <Field label="תאריך לידה" type="date" value={form.birth_date} onChange={v => setForm({...form, birth_date: v})} required />
                </div>
                {form.birth_date && <div style={{ fontSize: 13, color: '#2563eb', marginBottom: 12 }}>גיל: {calculateAge(form.birth_date)}</div>}
                <div style={S.fieldWrap}>
                  <label style={S.label}>מין</label>
                  <select style={S.select} value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option value="male">זכר</option>
                    <option value="female">נקבה</option>
                  </select>
                </div>
                <div style={S.grid2}>
                  <Field label="טלפון" type="tel" value={form.phone} onChange={v => setForm({...form, phone: v})} required />
                  <Field label='דוא"ל' type="email" value={form.email} onChange={v => setForm({...form, email: v})} required />
                </div>
                <div style={S.grid2}>
                  <Field label="יישוב" value={form.city} onChange={v => setForm({...form, city: v})} />
                  <Field label="קבוצה/מועדון" value={form.club} onChange={v => setForm({...form, club: v})} />
                </div>
                <div style={S.grid2}>
                  <Field label="איש קשר לחירום" value={form.emergency_contact} onChange={v => setForm({...form, emergency_contact: v})} />
                  <Field label="טלפון לחירום" type="tel" value={form.emergency_phone} onChange={v => setForm({...form, emergency_phone: v})} />
                </div>
                <div style={S.fieldWrap}>
                  <label style={S.label}>מידה לחולצה</label>
                  <select style={S.select} value={form.shirt_size} onChange={e => setForm({...form, shirt_size: e.target.value})}>
                    {['8','10','12','14','16','XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={S.fieldWrap}>
                  <label style={S.label}>הערות</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                    style={{ ...S.input, resize: 'vertical' as const }} />
                </div>
                <div style={S.divider} />
                <CheckField label="מאשר/ת הצהרת בריאות" checked={form.health_declaration} onChange={v => setForm({...form, health_declaration: v})} />
                <CheckField label="קראתי ואני מאשר/ת את התקנון" checked={form.rules_accepted} onChange={v => setForm({...form, rules_accepted: v})} />
                <CheckField label="מאשר/ת צילום ופרסום" checked={form.photo_consent} onChange={v => setForm({...form, photo_consent: v})} />
                <div style={S.btnRow}>
                  <button type="button" onClick={() => setStep('select')} style={S.btnSecondary}>חזרה</button>
                  <button type="submit" disabled={submitting} style={S.btnPrimary}>{submitting ? 'שולח...' : 'אישור הרשמה ✓'}</button>
                </div>
              </form>
            )}
          </div>
        )}

        {step === 'form' && regType === 'team' && (
          <div style={S.card}>
            <form onSubmit={submitTeam}>
              <div style={S.sectionTitle}>👥 פרטי הקבוצה</div>
              <Field label="שם הקבוצה" value={teamForm.name} onChange={v => setTeamForm({...teamForm, name: v})} required />
              <Field label="איש קשר" value={teamForm.contact_name} onChange={v => setTeamForm({...teamForm, contact_name: v})} required />
              <div style={S.grid2}>
                <Field label="טלפון" type="tel" value={teamForm.contact_phone} onChange={v => setTeamForm({...teamForm, contact_phone: v})} required />
                <Field label='דוא"ל' type="email" value={teamForm.contact_email} onChange={v => setTeamForm({...teamForm, contact_email: v})} required />
              </div>
              <div style={S.divider} />
              {(['swimmer','cyclist','runner'] as const).map(role => {
                const labels = { swimmer: '🏊 שחיין', cyclist: '🚴 רוכב', runner: '🏃 רץ' };
                const member = teamForm[role];
                return (
                  <div key={role} style={S.memberCard}>
                    <div style={S.memberTitle}>{labels[role]}</div>
                    <div style={S.grid2}>
                      <Field label="שם פרטי" value={member.first_name} onChange={v => setTeamForm({...teamForm, [role]: {...member, first_name: v}})} required />
                      <Field label="שם משפחה" value={member.last_name} onChange={v => setTeamForm({...teamForm, [role]: {...member, last_name: v}})} required />
                    </div>
                    <div style={S.grid2}>
                      <Field label="טלפון" type="tel" value={member.phone} onChange={v => setTeamForm({...teamForm, [role]: {...member, phone: v}})} required />
                      <Field label="תאריך לידה" type="date" value={member.birth_date} onChange={v => setTeamForm({...teamForm, [role]: {...member, birth_date: v}})} required />
                    </div>
                    <CheckField label="מאשר/ת הצהרת בריאות" checked={member.health} onChange={v => setTeamForm({...teamForm, [role]: {...member, health: v}})} />
                    <CheckField label="מאשר/ת תקנון" checked={member.rules} onChange={v => setTeamForm({...teamForm, [role]: {...member, rules: v}})} />
                  </div>
                );
              })}
              <div style={S.btnRow}>
                <button type="button" onClick={() => setStep('select')} style={S.btnSecondary}>חזרה</button>
                <button type="submit" disabled={submitting} style={S.btnPrimary}>{submitting ? 'שולח...' : 'אישור הרשמה ✓'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }} />
    </div>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
      <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
    </label>
  );
}
