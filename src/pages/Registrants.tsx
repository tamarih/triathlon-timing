import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Race } from '../lib/types';
import { LogOut, Search, Users } from 'lucide-react';

// Read-only, login-gated registrants list. Shows safe fields only
// (bib, name, race, category, city) — never phone / email / id / birth date.
interface SafeParticipant {
  id: string;
  bib_number?: string;
  first_name: string;
  last_name: string;
  gender?: string;
  city?: string;
  race_id: string;
  team_id?: string | null;
  selected_category?: string;
  recommended_category?: string;
}

const S = {
  page: { minHeight: '100vh', background: '#f3f4f6', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 40 },
  header: { background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 },
  inner: { maxWidth: 900, margin: '0 auto', padding: '20px 16px' },
  bar: { background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  searchWrap: { position: 'relative' as const, flex: 1, minWidth: 180 },
  search: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 34px 8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui' },
  searchIcon: { position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
  count: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  tableWrap: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'right' as const, padding: '11px 14px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1.5px solid #f3f4f6', whiteSpace: 'nowrap' as const },
  td: { padding: '10px 14px', borderBottom: '1px solid #f9fafb', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 48, color: '#9ca3af', fontSize: 15 },
};

export default function Registrants() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<SafeParticipant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      const active = data?.find(e => e.status === 'open' || e.status === 'closed') || data?.[0];
      if (active) setSelectedEvent(active.id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    setLoading(true);
    Promise.all([
      supabase.from('races').select('*').eq('event_id', selectedEvent),
      supabase.from('participants')
        .select('id, bib_number, first_name, last_name, gender, city, race_id, team_id, selected_category, recommended_category')
        .eq('event_id', selectedEvent),
    ]).then(([{ data: r }, { data: p }]) => {
      setRaces(r || []);
      const sorted = (p || []).sort((a, b) => (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0));
      setParticipants(sorted as SafeParticipant[]);
      setLoading(false);
    });
  }, [selectedEvent]);

  const raceName = (id: string) => races.find(r => r.id === id)?.name?.replace(/שליחים\s*ו/, '') || '—';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.bib_number || '').includes(q) ||
      raceName(p.race_id).toLowerCase().includes(q)
    );
  }, [participants, search, races]);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerTitle}><Users size={20} /> רשימת נרשמים</div>
        <button style={S.logoutBtn} onClick={async () => { await signOut(); navigate('/login'); }}>
          <LogOut size={15} /> יציאה
        </button>
      </div>

      <div style={S.inner}>
        <div style={S.bar}>
          {events.length > 1 && (
            <select style={S.select} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          )}
          <div style={S.searchWrap}>
            <input style={S.search} placeholder="חיפוש שם / מספר / מקצה" value={search} onChange={e => setSearch(e.target.value)} />
            <Search size={16} style={S.searchIcon} />
          </div>
        </div>

        <div style={S.count}>{filtered.length} נרשמים</div>

        <div style={S.tableWrap}>
          <div style={S.tableScroll}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>מס'</th>
                  <th style={S.th}>שם</th>
                  <th style={S.th}>מקצה</th>
                  <th style={S.th}>קטגוריה</th>
                  <th style={S.th}>יישוב</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: '#6b7280', fontWeight: 600 }}>{p.bib_number || '—'}</td>
                    <td style={{ ...S.td, fontWeight: 600, color: '#111827' }}>
                      {p.first_name} {p.last_name}
                      {p.team_id && <span style={{ fontSize: 11, color: '#7c3aed', marginRight: 6 }}>שליחים</span>}
                    </td>
                    <td style={{ ...S.td, color: '#374151' }}>{raceName(p.race_id)}</td>
                    <td style={{ ...S.td, color: '#6b7280' }}>{p.selected_category || p.recommended_category || '—'}</td>
                    <td style={{ ...S.td, color: '#6b7280' }}>{p.city || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && <div style={S.empty}>אין נרשמים להצגה</div>}
            {loading && <div style={S.empty}>טוען...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
