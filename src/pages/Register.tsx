import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event, Race } from '../lib/types';
import { calculateAge } from '../lib/utils';
import toast from 'react-hot-toast';

type RegType = 'personal' | 'team' | null;
type Category = 'ילדים א' | 'ילדים ב' | 'נוער' | 'בוגרים';

const HEALTH_ITEMS = [
  'אני מצהיר/ה כי אני נמצא/ת בכושר גופני תקין ומסוגל/ת להשתתף בתחרות טריאתלון',
  'אין לי מחלת לב, לחץ דם גבוה, מחלת ריאות, סוכרת או כל מחלה כרונית אחרת שעלולה להוות סיכון לפעילות',
  'לא אובחנתי לאחרונה עם כל מצב רפואי העלול להשפיע על כושר הגופני שלי',
  'לא קיבלתי הנחיה רפואית להימנע מפעילות גופנית מאומצת',
  'אני מתחייב/ת לפנות לטיפול רפואי מיד אם אחוש בכל אי-נוחות במהלך האירוע',
];

// Classify participant by birth year (event is Sept 2026)
function calcCategory(birthDate: string): Category {
  const year = new Date(birthDate).getFullYear();
  if (year >= 2017) return 'ילדים א';
  if (year >= 2015) return 'ילדים ב';
  if (year >= 2011) return 'נוער';
  return 'בוגרים';
}

function getRaceCriteria(raceName: string): string {
  if (raceName.includes('ילדים א')) return 'ילידי 2017 ואילך · גיל עד 8';
  if (raceName.includes('ילדים ב')) return 'ילידי 2015–2016 · גיל 9–10';
  if (raceName.includes('נוער')) return 'ילידי 2011–2014 · גיל 11–14';
  return 'ילידי 2010 ואילך · גיל 15+';
}

function getCategoryEmoji(cat: Category) {
  return cat === 'ילדים א' ? '🧒' : cat === 'ילדים ב' ? '👦' : cat === 'נוער' ? '🧑' : '🏃';
}

function getCategoryColor(cat: Category) {
  return cat === 'ילדים א' ? '#7c3aed' : cat === 'ילדים ב' ? '#0284c7' : cat === 'נוער' ? '#059669' : '#d97706';
}

// Find race that matches category
function getRecommendedRaceId(cat: Category, races: Race[]): string | null {
  if (cat === 'ילדים א') return races.find(r => r.name.includes('ילדים א'))?.id || null;
  if (cat === 'ילדים ב') return races.find(r => r.name.includes('ילדים ב'))?.id || null;
  if (cat === 'נוער') return races.find(r => r.name.includes('נוער'))?.id || null;
  // בוגרים can choose freely between קלאסי / ספרינטון
  return races.find(r => r.name.includes('קלאסי') || r.name.includes('ספרינטון'))?.id || null;
}

function isRaceMatchCategory(cat: Category, raceName: string): boolean {
  if (cat === 'ילדים א') return raceName.includes('ילדים א');
  if (cat === 'ילדים ב') return raceName.includes('ילדים ב');
  if (cat === 'נוער') return raceName.includes('נוער');
  // בוגרים can freely choose any adult race
  return raceName.includes('קלאסי') || raceName.includes('ספרינטון');
}

const APPROVAL_REASONS = [
  'רצון להתחרות עם אח/אחות',
  'רצון להתחרות עם חברים',
  'בקשת הורים',
  'ניסיון קודם ורמה מתאימה',
  'אחר',
];

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
  raceBtn: (selected: boolean, recommended: boolean): React.CSSProperties => ({
    border: selected ? '2px solid #2563eb' : recommended ? '2px solid #d97706' : '2px solid #e5e7eb',
    borderRadius: 14, padding: '14px 12px', textAlign: 'right' as const,
    background: selected ? '#eff6ff' : recommended ? '#fffbeb' : 'white', cursor: 'pointer',
    width: '100%', transition: 'all 0.15s',
  }),
  raceName: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 },
  raceSub: { fontSize: 12, color: '#6b7280' },
  raceDisabled: { opacity: 0.35, pointerEvents: 'none' as const },
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
    shirt_size: 'M', notes: '', rules_accepted: false, photo_consent: false,
    school_grade: '', approval_reason: '', parent_name: '',
  });
  const [healthItems, setHealthItems] = useState<boolean[]>(HEALTH_ITEMS.map(() => false));
  const allHealthChecked = healthItems.every(Boolean);

  const [teamForm, setTeamForm] = useState({
    name: '', contact_name: '', contact_phone: '', contact_email: '',
    swimmer: { first_name: '', last_name: '', phone: '', birth_date: '', health: false, rules: false },
    cyclist: { first_name: '', last_name: '', phone: '', birth_date: '', health: false, rules: false },
    runner: { first_name: '', last_name: '', phone: '', birth_date: '', health: false, rules: false },
  });

  useEffect(() => {
    supabase.from('events').select('*').eq('status', 'open').order('date').then(({ data }) => {
      const list = data || [];
      setEvents(list);
      if (list.length === 1 && !selectedEvent) setSelectedEvent(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).eq('is_open', true).then(({ data }) => setRaces(data || []));
  }, [selectedEvent]);

  // Auto-set recommended race when birth_date or races change
  useEffect(() => {
    if (!form.birth_date || races.length === 0) return;
    const cat = calcCategory(form.birth_date);
    const recId = getRecommendedRaceId(cat, races);
    if (recId && !selectedRace) setSelectedRace(recId);
  }, [form.birth_date, races]);

  const category: Category | null = form.birth_date ? calcCategory(form.birth_date) : null;
  const selectedRaceObj = races.find(r => r.id === selectedRace);
  const isChildCategory = category === 'ילדים א' || category === 'ילדים ב' || category === 'נוער';
  const raceMismatch = category && selectedRaceObj && !isRaceMatchCategory(category, selectedRaceObj.name);

  async function checkCapacity(raceId: string) {
    const race = races.find(r => r.id === raceId);
    if (!race?.max_participants) return { full: false };
    const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('race_id', raceId);
    return { full: (count || 0) >= race.max_participants };
  }

  async function submitPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!allHealthChecked) { toast.error('יש לאשר את כל סעיפי הצהרת הבריאות'); return; }
    if (!form.rules_accepted) { toast.error('יש לאשר את התקנון'); return; }
    setSubmitting(true);
    try {
      const cap = await checkCapacity(selectedRace);
      if (cap.full) { setWaitlist(true); setSubmitting(false); return; }

      // Auto-assign lane: pick the lane with fewest participants (1-6)
      const { data: laneData } = await supabase
        .from('participants')
        .select('lane')
        .eq('race_id', selectedRace)
        .not('lane', 'is', null);
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      for (const row of laneData || []) { if (row.lane >= 1 && row.lane <= 6) counts[row.lane]++; }
      const assignedLane = Number(Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0]);

      const rec_cat = category;
      const approval_status = raceMismatch ? 'pending' : null;
      const { error } = await supabase.from('participants').insert({
        event_id: selectedEvent,
        race_id: selectedRace,
        first_name: form.first_name,
        last_name: form.last_name,
        id_number: form.id_number,
        birth_date: form.birth_date,
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        city: form.city,
        club: form.club,
        shirt_size: form.shirt_size,
        notes: form.notes,
        health_declaration: allHealthChecked,
        rules_accepted: form.rules_accepted,
        photo_consent: false,
        school_grade: form.school_grade || null,
        recommended_category: rec_cat,
        selected_category: selectedRaceObj?.name || null,
        approval_status: null,
        approval_reason: null,
        lane: assignedLane,
      });
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
        await supabase.from('participants').insert({ event_id: selectedEvent, race_id: selectedRace, team_id: teamData.id, team_role: role, first_name: data.first_name, last_name: data.last_name, phone: data.phone, birth_date: data.birth_date, gender: 'male', email: teamForm.contact_email, health_declaration: data.health, rules_accepted: data.rules, photo_consent: false });
      }
      setStep('success');
    } catch (err: any) { toast.error(err.message || 'שגיאה בהרשמה'); }
    finally { setSubmitting(false); }
  }

  if (step === 'success') return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...S.card, textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{waitlist ? '⏳' : raceMismatch ? '⏳' : '🎉'}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          {waitlist ? 'נרשמת לרשימת המתנה!' : raceMismatch ? 'ההרשמה התקבלה — ממתינה לאישור' : 'ההרשמה הושלמה!'}
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
          {waitlist
            ? 'נעדכן אותך אם יפנה מקום.'
            : raceMismatch
              ? 'ההרשמה שלך נשלחה לאישור הועדה. נחזור אליך בהקדם.'
              : 'ברוכים הבאים לאירוע! 🏊🚴🏃'}
        </p>
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
            {selectedEvent && (
              <div style={S.fieldWrap}>
                <label style={S.label}>תאריך לידה (לסיווג קטגוריה)</label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={e => setForm({ ...form, birth_date: e.target.value })}
                  style={S.input}
                />
                {category && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: getCategoryColor(category) + '18', border: `1.5px solid ${getCategoryColor(category)}40`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{getCategoryEmoji(category)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: getCategoryColor(category) }}>קטגוריה: {category}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>גיל: {calculateAge(form.birth_date)} · המקצה המומלץ יסומן בכתום</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedEvent && races.length > 0 && !form.birth_date && (
              <div style={{ padding: '12px 16px', background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 12, fontSize: 13, color: '#92400e', textAlign: 'center' as const }}>
                יש לבחור תאריך לידה לפני בחירת מקצה
              </div>
            )}

            {selectedEvent && races.length > 0 && form.birth_date && (
              <div style={S.fieldWrap}>
                <label style={S.label}>בחרו מקצה</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {races.map(r => {
                    const isRec = category ? isRaceMatchCategory(category, r.name) : false;
                    const isDisabled = !!category && !isRec;
                    return (
                      <button key={r.id} onClick={() => !isDisabled && setSelectedRace(r.id)}
                        style={{ ...S.raceBtn(selectedRace === r.id, isRec), ...(isDisabled ? S.raceDisabled : {}) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={S.raceName}>{r.name.replace(/שליחים\s*ו/, '')} <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>({getRaceCriteria(r.name)})</span></div>
                            <div style={S.raceSub}>{r.type === 'relay' ? 'שלשות' : 'אישי'} · שחייה {r.swim_distance}מ' · אופניים {r.bike_distance}ק"מ · ריצה {r.run_distance}ק"מ</div>
                          </div>
                          {isRec && category && (
                            <span style={{ fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#92400e', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap', marginRight: 8 }}>
                              ⭐ מומלץ לך
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {selectedRace && selectedRaceObj?.type === 'relay' && (
                    <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', marginTop: 4, fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>
                      <strong>שימו לב — שלשות:</strong> רק אחד מחברי הקבוצה צריך להירשם. אין צורך שכל שלושת המשתתפים יירשמו בנפרד.<br/>
                      אם יש שינוי בהרכב הקבוצה לאחר ההרשמה, יש לפנות לבן אהובי לעדכון.
                    </div>
                  )}
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
                {/* Category banner */}
                {category && (
                  <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: getCategoryColor(category) + '12', border: `1.5px solid ${getCategoryColor(category)}40`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{getCategoryEmoji(category)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: getCategoryColor(category) }}>קטגוריה: {category}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>מקצה נבחר: {selectedRaceObj?.name}</div>
                    </div>
                    {raceMismatch && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', borderRadius: 20, padding: '3px 10px' }}>
                        ⚠️ טעון אישור
                      </span>
                    )}
                  </div>
                )}

                <div style={S.sectionTitle}>פרטים אישיים</div>
                <div style={S.grid2}>
                  <Field label="שם פרטי" value={form.first_name} onChange={v => setForm({...form, first_name: v})} required />
                  <Field label="שם משפחה" value={form.last_name} onChange={v => setForm({...form, last_name: v})} required />
                </div>
                <div style={S.grid2}>
                  <Field label='ת"ז' value={form.id_number} onChange={v => setForm({...form, id_number: v})} />
                  <Field label="תאריך לידה" type="date" value={form.birth_date} onChange={v => setForm({...form, birth_date: v})} required />
                </div>
                {form.birth_date && (
                  <div style={{ fontSize: 13, color: '#2563eb', marginBottom: 12 }}>
                    גיל: {calculateAge(form.birth_date)} · קטגוריה: {category}
                  </div>
                )}

                {/* School grade for kids/teens */}
                {isChildCategory && (
                  <div style={S.fieldWrap}>
                    <label style={S.label}>כיתה בבית ספר</label>
                    <input
                      style={S.input}
                      value={form.school_grade}
                      onChange={e => setForm({...form, school_grade: e.target.value})}
                      placeholder="לדוגמה: ד', ה', ו'..."
                    />
                  </div>
                )}

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

                {/* Health declaration */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>חלק א' — הצהרת בריאות</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>יש לסמן V על כל סעיף</div>
                  <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', background: '#f9fafb' }}>
                    {HEALTH_ITEMS.map((item, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < HEALTH_ITEMS.length - 1 ? 12 : 0, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={healthItems[i]}
                          onChange={e => { const next = [...healthItems]; next[i] = e.target.checked; setHealthItems(next); }}
                          style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Minor parent consent */}
                {form.birth_date && calculateAge(form.birth_date) < 18 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>חלק ב' — הסכמת הורה / אפוטרופוס</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                      משתתף שטרם מלאו לו 18 שנה יצרף את הסכמת הורה חתומה.
                    </div>
                    <div style={{ border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 16px', background: '#fffbeb' }}>
                      <div style={{ fontSize: 13, color: '#92400e', marginBottom: 12, lineHeight: 1.6 }}>
                        אני, ההורה / האפוטרופוס החתום מטה, מסכים/ה להשתתפות הקטין/ה באירוע ומאשר/ת את הצהרת הבריאות לעיל.
                      </div>
                      <Field label="שם מלא של ההורה / אפוטרופוס" value={form.parent_name} onChange={v => setForm({...form, parent_name: v})} required />
                    </div>
                  </div>
                )}

                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', marginBottom: 12, background: '#f9fafb' }}>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 12 }}>
                    הנני מצהיר/ה בזאת שכל הפרטים שמסרתי נכונים ומצבי הגופני והנפשי נבדק ואושר בטרם השתתפותי בטריאתלון בידי רופא מוסמך ולא נמצא כל ממצא חריג. ידוע לי כי הוועדה המארגנת של האירוע, יועצי האירוע, הגוף המארח, הגוף המארגן, המארגן בפועל ונותני החסויות לא ישאו בכל אחריות לנזק כלשהו שייגרם לי לרבות נזקי גוף שיגרמו לי טרם האירוע, במהלכו או אחריו, ואף לא בגין אובדן ציוד כלשהוא. על כן אני החתום/ה מטה מוותר/ת על כל זכות לתביעת נזיקין כלשהי נגד הגופים הנ"ל. ידוע לי שתנאי זה מהווה יסוד להסכמתם של מארגני המרוץ והממונים עליו לשתפני.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: allHealthChecked ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={form.rules_accepted}
                      onChange={e => { if (!allHealthChecked) { toast.error('יש לאשר תחילה את כל סעיפי הצהרת הבריאות'); return; } setForm({...form, rules_accepted: e.target.checked}); }}
                      style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>קראתי ואני מאשר/ת את התקנון ואת ההצהרה לעיל</span>
                  </label>
                </div>

                <div style={S.btnRow}>
                  <button type="button" onClick={() => setStep('select')} style={S.btnSecondary}>חזרה</button>
                  <button type="submit" disabled={submitting} style={S.btnPrimary}>
                    {submitting ? 'שולח...' : 'אישור הרשמה ✓'}
                  </button>
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
