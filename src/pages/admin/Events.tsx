import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Race } from '../../lib/types';
import { formatDate } from '../../lib/utils';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface EventFormData {
  name: string; date: string; start_time: string; location: string;
  description: string; logo_url: string; banner_url: string;
  rules_file_url: string; health_declaration_url: string; status: string;
}

const emptyEvent: EventFormData = {
  name: '', date: '', start_time: '08:00', location: '', description: '',
  logo_url: '', banner_url: '', rules_file_url: '', health_declaration_url: '', status: 'draft',
};

const emptyRace = {
  name: '', description: '', type: 'individual' as const, gun_time: '08:00',
  swim_distance: 0, bike_distance: 0, run_distance: 0, price: 0,
  min_age: undefined as number | undefined, max_age: undefined as number | undefined,
  max_participants: undefined as number | undefined, is_open: true,
};

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 800, margin: '0 auto', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  card: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 12, overflow: 'hidden' as const },
  cardRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' },
  eventName: { fontSize: 16, fontWeight: 700, color: '#111827' },
  eventMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  badge: (status: string) => ({
    display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
    background: status === 'open' ? '#dcfce7' : status === 'finished' ? '#e0e7ff' : status === 'closed' ? '#fef9c3' : '#f3f4f6',
    color: status === 'open' ? '#15803d' : status === 'finished' ? '#3730a3' : status === 'closed' ? '#92400e' : '#6b7280',
  }),
  iconBtn: (color: string) => ({ background: 'none', border: 'none', cursor: 'pointer', color, padding: '6px', borderRadius: 8, display: 'flex', alignItems: 'center' as const }),
  racesSection: { borderTop: '1px solid #f3f4f6', background: '#f9fafb', padding: '14px 16px' },
  raceRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #e5e7eb' },
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' as const },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 520, marginTop: 40 },
  modalInner: { padding: 24 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#111827' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', marginBottom: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  btnRow: { display: 'flex', gap: 10, marginTop: 4 },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};

const statusLabels: Record<string, string> = { draft: 'טיוטה', open: 'פתוח', closed: 'סגור', finished: 'הסתיים' };

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
    setEventForm({ name: event.name, date: event.date, start_time: event.start_time, location: event.location, description: event.description || '', logo_url: event.logo_url || '', banner_url: event.banner_url || '', rules_file_url: event.rules_file_url || '', health_declaration_url: event.health_declaration_url || '', status: event.status });
    setShowEventForm(true);
  }

  function openNewEvent() { setEditEvent(null); setEventForm(emptyEvent); setShowEventForm(true); }
  function openEditRace(race: Race) { setEditRace(race); setRaceForm({ ...race } as any); setShowRaceForm(race.event_id); }
  function openNewRace(eventId: string) { setEditRace(null); setRaceForm(emptyRace); setShowRaceForm(eventId); }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (editEvent) { const { error } = await supabase.from('events').update(eventForm).eq('id', editEvent.id); if (error) throw error; toast.success('האירוע עודכן'); }
      else { const { error } = await supabase.from('events').insert(eventForm); if (error) throw error; toast.success('האירוע נוצר'); }
      setShowEventForm(false); loadEvents();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function saveRace(e: React.FormEvent, eventId: string) {
    e.preventDefault(); setSaving(true);
    try {
      if (editRace) { const { error } = await supabase.from('races').update(raceForm).eq('id', editRace.id); if (error) throw error; toast.success('המקצה עודכן'); }
      else { const { error } = await supabase.from('races').insert({ ...raceForm, event_id: eventId }); if (error) throw error; toast.success('המקצה נוצר'); }
      setShowRaceForm(null); loadRaces(eventId);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function deleteEvent(id: string) {
    if (!confirm('למחוק את האירוע?')) return;
    await supabase.from('events').delete().eq('id', id);
    toast.success('האירוע נמחק'); loadEvents();
  }

  async function deleteRace(id: string, eventId: string) {
    if (!confirm('למחוק את המקצה?')) return;
    await supabase.from('races').delete().eq('id', id);
    toast.success('המקצה נמחק'); loadRaces(eventId);
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>ניהול אירועים</span>
        <button style={S.addBtn} onClick={openNewEvent}><Plus size={15} /> אירוע חדש</button>
      </div>

      {/* Event form modal */}
      {showEventForm && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalInner}>
              <div style={S.modalHeader}>
                <span style={S.modalTitle}>{editEvent ? 'עריכת אירוע' : 'אירוע חדש'}</span>
                <button style={S.closeBtn} onClick={() => setShowEventForm(false)}><X size={18} /></button>
              </div>
              <form onSubmit={saveEvent}>
                <label style={S.label}>שם אירוע</label>
                <input style={S.input} value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} required placeholder="טריאתלון יקנעם 2025" />
                <div style={S.grid2}>
                  <div>
                    <label style={S.label}>תאריך</label>
                    <input style={S.input} type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} required />
                  </div>
                  <div>
                    <label style={S.label}>שעת התחלה</label>
                    <input style={S.input} type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time: e.target.value})} required />
                  </div>
                </div>
                <label style={S.label}>מיקום</label>
                <input style={S.input} value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} required placeholder="בריכה יקנעם מושבה" />
                <label style={S.label}>תיאור</label>
                <textarea style={{ ...S.input, resize: 'vertical' as const }} rows={2} value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                <label style={S.label}>סטטוס</label>
                <select style={S.input} value={eventForm.status} onChange={e => setEventForm({...eventForm, status: e.target.value})}>
                  <option value="draft">טיוטה</option>
                  <option value="open">פתוח להרשמה</option>
                  <option value="closed">סגור להרשמה</option>
                  <option value="finished">הסתיים</option>
                </select>
                <div style={S.btnRow}>
                  <button type="button" style={S.btnSecondary} onClick={() => setShowEventForm(false)}>ביטול</button>
                  <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : 'שמירה'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Race form modal */}
      {showRaceForm && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalInner}>
              <div style={S.modalHeader}>
                <span style={S.modalTitle}>{editRace ? 'עריכת מקצה' : 'מקצה חדש'}</span>
                <button style={S.closeBtn} onClick={() => setShowRaceForm(null)}><X size={18} /></button>
              </div>
              <form onSubmit={e => saveRace(e, showRaceForm)}>
                <label style={S.label}>שם מקצה</label>
                <input style={S.input} value={raceForm.name} onChange={e => setRaceForm({...raceForm, name: e.target.value})} required placeholder="ילדים א / קלאסי בוגרים..." />
                <div style={S.grid2}>
                  <div>
                    <label style={S.label}>סוג</label>
                    <select style={S.input} value={raceForm.type} onChange={e => setRaceForm({...raceForm, type: e.target.value as any})}>
                      <option value="individual">אישי</option>
                      <option value="relay">שליחים</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>שעת זינוק</label>
                    <input style={S.input} type="time" value={raceForm.gun_time} onChange={e => setRaceForm({...raceForm, gun_time: e.target.value})} required />
                  </div>
                </div>
                <div style={S.grid3}>
                  <div><label style={S.label}>שחייה (מ')</label><input style={S.input} type="number" value={raceForm.swim_distance} onChange={e => setRaceForm({...raceForm, swim_distance: Number(e.target.value)})} /></div>
                  <div><label style={S.label}>אופניים (ק"מ)</label><input style={S.input} type="number" value={raceForm.bike_distance} onChange={e => setRaceForm({...raceForm, bike_distance: Number(e.target.value)})} /></div>
                  <div><label style={S.label}>ריצה (ק"מ)</label><input style={S.input} type="number" value={raceForm.run_distance} onChange={e => setRaceForm({...raceForm, run_distance: Number(e.target.value)})} /></div>
                </div>
                <div style={S.grid3}>
                  <div><label style={S.label}>מחיר (₪)</label><input style={S.input} type="number" value={raceForm.price} onChange={e => setRaceForm({...raceForm, price: Number(e.target.value)})} /></div>
                  <div><label style={S.label}>גיל מינ'</label><input style={S.input} type="number" value={raceForm.min_age || ''} onChange={e => setRaceForm({...raceForm, min_age: e.target.value ? Number(e.target.value) : undefined})} /></div>
                  <div><label style={S.label}>גיל מקס'</label><input style={S.input} type="number" value={raceForm.max_age || ''} onChange={e => setRaceForm({...raceForm, max_age: e.target.value ? Number(e.target.value) : undefined})} /></div>
                </div>
                <label style={S.label}>מקס' משתתפים</label>
                <input style={S.input} type="number" value={raceForm.max_participants || ''} onChange={e => setRaceForm({...raceForm, max_participants: e.target.value ? Number(e.target.value) : undefined})} placeholder="ריק = ללא הגבלה" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
                  <input type="checkbox" checked={raceForm.is_open} onChange={e => setRaceForm({...raceForm, is_open: e.target.checked})} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>פתוח להרשמה</span>
                </label>
                <div style={S.btnRow}>
                  <button type="button" style={S.btnSecondary} onClick={() => setShowRaceForm(null)}>ביטול</button>
                  <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : 'שמירה'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p>אין אירועים. לחצו על "אירוע חדש" ליצירה.</p>
        </div>
      ) : events.map(event => (
        <div key={event.id} style={S.card}>
          <div style={S.cardRow}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={S.eventName}>{event.name}</span>
                <span style={S.badge(event.status) as React.CSSProperties}>{statusLabels[event.status]}</span>
              </div>
              <div style={S.eventMeta}>{formatDate(event.date)} · {event.location}</div>
            </div>
            <button style={S.iconBtn('#6b7280')} onClick={() => openEditEvent(event)}><Edit2 size={15} /></button>
            <button style={S.iconBtn('#ef4444')} onClick={() => deleteEvent(event.id)}><Trash2 size={15} /></button>
            <button style={S.iconBtn('#6b7280')} onClick={() => { setExpandedEvent(expandedEvent === event.id ? null : event.id); if (expandedEvent !== event.id) loadRaces(event.id); }}>
              {expandedEvent === event.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {expandedEvent === event.id && (
            <div style={S.racesSection}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>מקצים</span>
                <button onClick={() => openNewRace(event.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={13} /> מקצה חדש
                </button>
              </div>
              {(races[event.id] || []).length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>אין מקצים עדיין</p>
              ) : (races[event.id] || []).map(race => (
                <div key={race.id} style={S.raceRow}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{race.name}</span>
                    <span style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>{race.type === 'relay' ? 'שליחים' : 'אישי'} · 🏊{race.swim_distance}מ' · 🚴{race.bike_distance}ק"מ · 🏃{race.run_distance}ק"מ</span>
                    {!race.is_open && <span style={{ fontSize: 11, color: '#ef4444', marginRight: 4 }}>סגור</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={S.iconBtn('#6b7280')} onClick={() => openEditRace(race)}><Edit2 size={13} /></button>
                    <button style={S.iconBtn('#ef4444')} onClick={() => deleteRace(race.id, event.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
