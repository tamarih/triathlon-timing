import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event, Race } from '../lib/types';
import { calculateAge } from '../lib/utils';
import toast from 'react-hot-toast';

type RegType = 'personal' | 'team' | null;

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

  // Personal form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', id_number: '', birth_date: '',
    gender: 'male', phone: '', email: '', city: '', club: '',
    emergency_contact: '', emergency_phone: '', shirt_size: 'M',
    notes: '', health_declaration: false, rules_accepted: false, photo_consent: false,
  });

  // Team form state
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

  async function checkCapacity(raceId: string): Promise<{ full: boolean; count: number; max: number | null }> {
    const race = races.find(r => r.id === raceId);
    if (!race?.max_participants) return { full: false, count: 0, max: null };
    const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('race_id', raceId);
    return { full: (count || 0) >= race.max_participants, count: count || 0, max: race.max_participants };
  }

  async function submitPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.health_declaration || !form.rules_accepted) {
      toast.error('יש לאשר את הצהרת הבריאות והתקנון');
      return;
    }
    setSubmitting(true);
    try {
      const cap = await checkCapacity(selectedRace);
      if (cap.full) { setWaitlist(true); setSubmitting(false); return; }

      const age = form.birth_date ? calculateAge(form.birth_date) : null;
      const { error } = await supabase.from('participants').insert({
        event_id: selectedEvent, race_id: selectedRace,
        ...form, age,
      });
      if (error) throw error;
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בהרשמה');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWaitlist() {
    setSubmitting(true);
    try {
      await supabase.from('waitlist').insert({
        event_id: selectedEvent, race_id: selectedRace,
        name: `${form.first_name} ${form.last_name}`,
        phone: form.phone, email: form.email,
      });
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTeam(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: teamData, error: teamErr } = await supabase.from('teams').insert({
        event_id: selectedEvent, race_id: selectedRace,
        name: teamForm.name, contact_name: teamForm.contact_name,
        contact_phone: teamForm.contact_phone, contact_email: teamForm.contact_email,
      }).select().single();
      if (teamErr) throw teamErr;

      const members = [
        { role: 'swimmer', data: teamForm.swimmer },
        { role: 'cyclist', data: teamForm.cyclist },
        { role: 'runner', data: teamForm.runner },
      ];

      for (const m of members) {
        const age = m.data.birth_date ? calculateAge(m.data.birth_date) : null;
        await supabase.from('participants').insert({
          event_id: selectedEvent, race_id: selectedRace,
          team_id: teamData.id, team_role: m.role,
          first_name: m.data.first_name, last_name: m.data.last_name,
          phone: m.data.phone, birth_date: m.data.birth_date,
          gender: 'male', email: teamForm.contact_email,
          health_declaration: m.data.health, rules_accepted: m.data.rules,
          photo_consent: false, age,
        });
      }
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בהרשמה');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRaceObj = races.find(r => r.id === selectedRace);

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-4">{waitlist ? '⏳' : '🎉'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {waitlist ? 'נרשמת לרשימת המתנה!' : 'ההרשמה הושלמה!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {waitlist ? 'נעדכן אותך אם יפנה מקום.' : 'ברוכים הבאים לאירוע!'}
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/" className="bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              חזרה לדף הבית
            </Link>
            <Link to="/results" className="border border-blue-200 text-blue-600 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              צפייה בתוצאות
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">הרשמה לאירוע</h1>
        </div>

        {/* Step 1: Select event & race */}
        {step === 'select' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">בחרו אירוע</label>
              <select
                value={selectedEvent}
                onChange={e => { setSelectedEvent(e.target.value); setSelectedRace(''); setRegType(null); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- בחרו אירוע --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>

            {selectedEvent && races.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">בחרו מקצה</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {races.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRace(r.id)}
                      className={`border-2 rounded-xl p-4 text-right transition-colors ${
                        selectedRace === r.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {r.type === 'relay' ? 'שליחים' : 'אישי'} · ₪{r.price}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        שחייה {r.swim_distance}מ' · אופניים {r.bike_distance}ק"מ · ריצה {r.run_distance}ק"מ
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedRace && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג הרשמה</label>
                <div className="grid grid-cols-2 gap-3">
                  {(selectedRaceObj?.type === 'individual' || !selectedRaceObj) && (
                    <button
                      onClick={() => { setRegType('personal'); setStep('form'); }}
                      className="border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-1">👤</div>
                      <div className="font-medium text-gray-900">הרשמה אישית</div>
                    </button>
                  )}
                  {(selectedRaceObj?.type === 'relay') && (
                    <button
                      onClick={() => { setRegType('team'); setStep('form'); }}
                      className="border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-1">👥</div>
                      <div className="font-medium text-gray-900">הרשמה קבוצתית</div>
                    </button>
                  )}
                  {selectedRaceObj?.type === 'individual' && (
                    <button
                      onClick={() => { setRegType('team'); setStep('form'); }}
                      className="border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-1">👥</div>
                      <div className="font-medium text-gray-900">הרשמה קבוצתית</div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2a: Personal form */}
        {step === 'form' && regType === 'personal' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {waitlist ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">המקצה מלא</h3>
                <p className="text-gray-600 mb-6">תוכלו להצטרף לרשימת המתנה</p>
                <button onClick={submitWaitlist} disabled={submitting} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? '...' : 'הצטרפות לרשימת המתנה'}
                </button>
              </div>
            ) : (
              <form onSubmit={submitPersonal} className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">פרטים אישיים</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="שם פרטי" value={form.first_name} onChange={v => setForm({...form, first_name: v})} required />
                  <Field label="שם משפחה" value={form.last_name} onChange={v => setForm({...form, last_name: v})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label='ת"ז' value={form.id_number} onChange={v => setForm({...form, id_number: v})} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לידה</label>
                    <input type="date" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                  </div>
                </div>
                {form.birth_date && (
                  <div className="text-sm text-blue-600">גיל מחושב: {calculateAge(form.birth_date)}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מין</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="male">זכר</option>
                    <option value="female">נקבה</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="טלפון" type="tel" value={form.phone} onChange={v => setForm({...form, phone: v})} required />
                  <Field label='דוא"ל' type="email" value={form.email} onChange={v => setForm({...form, email: v})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="יישוב" value={form.city} onChange={v => setForm({...form, city: v})} />
                  <Field label="קבוצה/מועדון" value={form.club} onChange={v => setForm({...form, club: v})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="איש קשר לחירום" value={form.emergency_contact} onChange={v => setForm({...form, emergency_contact: v})} />
                  <Field label="טלפון לחירום" type="tel" value={form.emergency_phone} onChange={v => setForm({...form, emergency_phone: v})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מידה לחולצה</label>
                  <select value={form.shirt_size} onChange={e => setForm({...form, shirt_size: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    {['8','10','12','14','16','XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                    rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <CheckField label="מאשר/ת הצהרת בריאות" checked={form.health_declaration} onChange={v => setForm({...form, health_declaration: v})} />
                  <CheckField label="קראתי ואני מאשר/ת את התקנון" checked={form.rules_accepted} onChange={v => setForm({...form, rules_accepted: v})} />
                  <CheckField label="מאשר/ת צילום ופרסום" checked={form.photo_consent} onChange={v => setForm({...form, photo_consent: v})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('select')} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                    חזרה
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                    {submitting ? 'שולח...' : 'אישור הרשמה'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Step 2b: Team form */}
        {step === 'form' && regType === 'team' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <form onSubmit={submitTeam} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">פרטי הקבוצה</h2>
                <div className="space-y-3">
                  <Field label="שם הקבוצה" value={teamForm.name} onChange={v => setTeamForm({...teamForm, name: v})} required />
                  <Field label="איש קשר" value={teamForm.contact_name} onChange={v => setTeamForm({...teamForm, contact_name: v})} required />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="טלפון" type="tel" value={teamForm.contact_phone} onChange={v => setTeamForm({...teamForm, contact_phone: v})} required />
                    <Field label='דוא"ל' type="email" value={teamForm.contact_email} onChange={v => setTeamForm({...teamForm, contact_email: v})} required />
                  </div>
                </div>
              </div>
              {(['swimmer','cyclist','runner'] as const).map(role => {
                const labels = { swimmer: '🏊 שחיין', cyclist: '🚴 רוכב', runner: '🏃 רץ' };
                const member = teamForm[role];
                return (
                  <div key={role} className="border border-gray-200 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{labels[role]}</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="שם פרטי" value={member.first_name} onChange={v => setTeamForm({...teamForm, [role]: {...member, first_name: v}})} required />
                        <Field label="שם משפחה" value={member.last_name} onChange={v => setTeamForm({...teamForm, [role]: {...member, last_name: v}})} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="טלפון" type="tel" value={member.phone} onChange={v => setTeamForm({...teamForm, [role]: {...member, phone: v}})} required />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לידה</label>
                          <input type="date" value={member.birth_date} onChange={e => setTeamForm({...teamForm, [role]: {...member, birth_date: e.target.value}})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                        </div>
                      </div>
                      <CheckField label="מאשר/ת הצהרת בריאות" checked={member.health} onChange={v => setTeamForm({...teamForm, [role]: {...member, health: v}})} />
                      <CheckField label="מאשר/ת תקנון" checked={member.rules} onChange={v => setTeamForm({...teamForm, [role]: {...member, rules: v}})} />
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('select')} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  חזרה
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'שולח...' : 'אישור הרשמה'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
}

function CheckField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
