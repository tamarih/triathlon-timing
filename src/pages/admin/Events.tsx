import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Race } from '../../lib/types';
import { formatDate } from '../../lib/utils';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface EventFormData {
  name: string; date: string; start_time: string; location: string;
  description: string; logo_url: string; banner_url: string;
  rules_file_url: string; health_declaration_url: string; status: string;
}

const emptyEvent: EventFormData = {
  name: '', date: '', start_time: '08:00', location: '', description: '',
  logo_url: '', banner_url: '', rules_file_url: '', health_declaration_url: '',
  status: 'draft',
};

const emptyRace = {
  name: '', description: '', type: 'individual' as const, gun_time: '08:00',
  swim_distance: 0, bike_distance: 0, run_distance: 0, price: 0,
  min_age: undefined as number | undefined, max_age: undefined as number | undefined,
  max_participants: undefined as number | undefined, is_open: true,
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Record<string, Race[]>>({});
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showRaceForm, setShowRaceForm] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [editRace, setEditRace] = useState<Race | null>(null);
  const [eventForm, setEventForm] = useState<EventFormData>(emptyEvent);
  const [raceForm, setRaceForm] = useState(emptyRace);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false });
    setEvents(data || []);
  }

  async function loadRaces(eventId: string) {
    const { data } = await supabase.from('races').select('*').eq('event_id', eventId).order('gun_time');
    setRaces(prev => ({ ...prev, [eventId]: data || [] }));
  }

  function openEditEvent(event: Event) {
    setEditEvent(event);
    setEventForm({
      name: event.name, date: event.date, start_time: event.start_time,
      location: event.location, description: event.description || '',
      logo_url: event.logo_url || '', banner_url: event.banner_url || '',
      rules_file_url: event.rules_file_url || '',
      health_declaration_url: event.health_declaration_url || '',
      status: event.status,
    });
    setShowEventForm(true);
  }

  function openNewEvent() {
    setEditEvent(null);
    setEventForm(emptyEvent);
    setShowEventForm(true);
  }

  function openEditRace(race: Race) {
    setEditRace(race);
    setRaceForm({ ...race } as any);
    setShowRaceForm(race.event_id);
  }

  function openNewRace(eventId: string) {
    setEditRace(null);
    setRaceForm(emptyRace);
    setShowRaceForm(eventId);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editEvent) {
        const { error } = await supabase.from('events').update(eventForm).eq('id', editEvent.id);
        if (error) throw error;
        toast.success('האירוע עודכן');
      } else {
        const { error } = await supabase.from('events').insert(eventForm);
        if (error) throw error;
        toast.success('האירוע נוצר');
      }
      setShowEventForm(false);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveRace(e: React.FormEvent, eventId: string) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRace) {
        const { error } = await supabase.from('races').update(raceForm).eq('id', editRace.id);
        if (error) throw error;
        toast.success('המקצה עודכן');
      } else {
        const { error } = await supabase.from('races').insert({ ...raceForm, event_id: eventId });
        if (error) throw error;
        toast.success('המקצה נוצר');
      }
      setShowRaceForm(null);
      loadRaces(eventId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('למחוק את האירוע? כל הנתונים הקשורים יימחקו.')) return;
    await supabase.from('events').delete().eq('id', id);
    toast.success('האירוע נמחק');
    loadEvents();
  }

  async function deleteRace(id: string, eventId: string) {
    if (!confirm('למחוק את המקצה?')) return;
    await supabase.from('races').delete().eq('id', id);
    toast.success('המקצה נמחק');
    loadRaces(eventId);
  }

  const statusLabels: Record<string, string> = {
    draft: 'טיוטה', open: 'פתוח', closed: 'סגור', finished: 'הסתיים'
  };
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', open: 'bg-green-100 text-green-700',
    closed: 'bg-orange-100 text-orange-700', finished: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ניהול אירועים</h1>
        <button onClick={openNewEvent} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> אירוע חדש
        </button>
      </div>

      {/* Event form modal */}
      {showEventForm && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:16, overflowY:'auto' }}>
          <div style={{ background:'white', borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,0.2)', width:'100%', maxWidth:560, marginTop:40 }}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">{editEvent ? 'עריכת אירוע' : 'אירוע חדש'}</h2>
              <form onSubmit={saveEvent} className="space-y-3">
                <FormField label="שם אירוע" value={eventForm.name} onChange={v => setEventForm({...eventForm, name: v})} required />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="תאריך" type="date" value={eventForm.date} onChange={v => setEventForm({...eventForm, date: v})} required />
                  <FormField label="שעת התחלה" type="time" value={eventForm.start_time} onChange={v => setEventForm({...eventForm, start_time: v})} required />
                </div>
                <FormField label="מיקום" value={eventForm.location} onChange={v => setEventForm({...eventForm, location: v})} required />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
                  <textarea value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                  <select value={eventForm.status} onChange={e => setEventForm({...eventForm, status: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="draft">טיוטה</option>
                    <option value="open">פתוח להרשמה</option>
                    <option value="closed">סגור להרשמה</option>
                    <option value="finished">הסתיים</option>
                  </select>
                </div>
                <FormField label="URL לוגו" value={eventForm.logo_url || ''} onChange={v => setEventForm({...eventForm, logo_url: v})} />
                <FormField label="URL באנר" value={eventForm.banner_url || ''} onChange={v => setEventForm({...eventForm, banner_url: v})} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEventForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm">ביטול</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'שומר...' : 'שמירה'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Race form modal */}
      {showRaceForm && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:16, overflowY:'auto' }}>
          <div style={{ background:'white', borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,0.2)', width:'100%', maxWidth:560, marginTop:40 }}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">{editRace ? 'עריכת מקצה' : 'מקצה חדש'}</h2>
              <form onSubmit={e => saveRace(e, showRaceForm)} className="space-y-3">
                <FormField label="שם מקצה" value={raceForm.name} onChange={v => setRaceForm({...raceForm, name: v})} required />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
                    <select value={raceForm.type} onChange={e => setRaceForm({...raceForm, type: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="individual">אישי</option>
                      <option value="relay">שליחים</option>
                    </select>
                  </div>
                  <FormField label="שעת זינוק" type="time" value={raceForm.gun_time} onChange={v => setRaceForm({...raceForm, gun_time: v})} required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="שחייה (מ')" type="number" value={String(raceForm.swim_distance)} onChange={v => setRaceForm({...raceForm, swim_distance: Number(v)})} />
                  <FormField label='אופניים (ק"מ)' type="number" value={String(raceForm.bike_distance)} onChange={v => setRaceForm({...raceForm, bike_distance: Number(v)})} />
                  <FormField label='ריצה (ק"מ)' type="number" value={String(raceForm.run_distance)} onChange={v => setRaceForm({...raceForm, run_distance: Number(v)})} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="מחיר (₪)" type="number" value={String(raceForm.price)} onChange={v => setRaceForm({...raceForm, price: Number(v)})} />
                  <FormField label="גיל מינ'" type="number" value={String(raceForm.min_age || '')} onChange={v => setRaceForm({...raceForm, min_age: v ? Number(v) : undefined})} />
                  <FormField label="גיל מקס'" type="number" value={String(raceForm.max_age || '')} onChange={v => setRaceForm({...raceForm, max_age: v ? Number(v) : undefined})} />
                </div>
                <FormField label="מקסימום משתתפים" type="number" value={String(raceForm.max_participants || '')} onChange={v => setRaceForm({...raceForm, max_participants: v ? Number(v) : undefined})} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={raceForm.is_open} onChange={e => setRaceForm({...raceForm, is_open: e.target.checked})} className="rounded" />
                  <span className="text-sm text-gray-700">פתוח להרשמה</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowRaceForm(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm">ביטול</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'שומר...' : 'שמירה'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="space-y-4">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">{event.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[event.status]}`}>
                    {statusLabels[event.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-500">{formatDate(event.date)} · {event.location}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditEvent(event)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => deleteEvent(event.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => {
                    setExpandedEvent(expandedEvent === event.id ? null : event.id);
                    if (expandedEvent !== event.id) loadRaces(event.id);
                  }}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  {expandedEvent === event.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expandedEvent === event.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">מקצים</h4>
                  <button onClick={() => openNewRace(event.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                    <Plus size={13} /> מקצה חדש
                  </button>
                </div>
                {(races[event.id] || []).length === 0 ? (
                  <p className="text-sm text-gray-400">אין מקצים עדיין</p>
                ) : (
                  <div className="space-y-2">
                    {(races[event.id] || []).map(race => (
                      <div key={race.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{race.name}</span>
                          <span className="text-xs text-gray-500 mr-2">{race.type === 'relay' ? 'שליחים' : 'אישי'} · ₪{race.price}</span>
                          {!race.is_open && <span className="text-xs text-red-500 mr-1">סגור</span>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditRace(race)} className="p-1 text-gray-400 hover:text-blue-600">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => deleteRace(race.id, event.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-16 text-gray-400">אין אירועים. לחצו על "אירוע חדש" ליצירה.</div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    </div>
  );
}
