import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event, Race, Participant } from '../../lib/types';
import { formatTime, timeDiffSeconds, statusLabel } from '../../lib/utils';
import { Trophy } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface RankedResult {
  participant: Participant;
  race: Race | undefined;
  swim?: number; bike?: number; run?: number; total?: number;
  overall_rank?: number; gender_rank?: number; race_rank?: number;
}

const S = {
  page: { direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1100, margin: '0 auto', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#111827' },
  filtersBar: { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap' as const, gap: 10 },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  tableWrap: { background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'right' as const, padding: '11px 14px', fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderBottom: '1.5px solid #f3f4f6' },
  tdBase: { padding: '10px 14px', borderBottom: '1px solid #f9fafb' },
  empty: { textAlign: 'center' as const, padding: 48, color: '#9ca3af', fontSize: 15 },
};

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    finished: { bg: '#dcfce7', color: '#15803d' },
    dnf: { bg: '#fee2e2', color: '#dc2626' },
    started: { bg: '#dbeafe', color: '#1d4ed8' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return { ...s, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 };
};

export default function AdminResults() {
  const [events, setEvents] = useState<Event[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [results, setResults] = useState<RankedResult[]>([]);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setSelectedEvent(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    supabase.from('races').select('*').eq('event_id', selectedEvent).then(({ data }) => setRaces(data || []));
    loadResults();
  }, [selectedEvent]);

  async function loadResults() {
    if (!selectedEvent) return;
    const [{ data: parts }, { data: timings }, { data: racesData }] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', selectedEvent).neq('status', 'dns'),
      supabase.from('timing_records').select('*').eq('event_id', selectedEvent),
      supabase.from('races').select('*').eq('event_id', selectedEvent),
    ]);

    const raceList = racesData || [];
    const computed: RankedResult[] = (parts || []).map(p => {
      const race = raceList.find(r => r.id === p.race_id);
      const gunStr = race ? `1970-01-01T${race.gun_time}` : '';
      const t1 = timings?.find(t => t.participant_id === p.id && t.station === 1);
      const t2 = timings?.find(t => t.participant_id === p.id && t.station === 2);
      const t3 = timings?.find(t => t.participant_id === p.id && t.station === 3);
      const swim = t1 && gunStr ? timeDiffSeconds(gunStr, t1.recorded_at) : undefined;
      const bike = t1 && t2 ? timeDiffSeconds(t1.recorded_at, t2.recorded_at) : undefined;
      const run = t2 && t3 ? timeDiffSeconds(t2.recorded_at, t3.recorded_at) : undefined;
      const total = t3 && gunStr ? timeDiffSeconds(gunStr, t3.recorded_at) : undefined;
      return { participant: p, race, swim, bike, run, total };
    });

    computed.sort((a, b) => {
      if (a.total !== undefined && b.total !== undefined) return a.total - b.total;
      if (a.total !== undefined) return -1;
      if (b.total !== undefined) return 1;
      return 0;
    });

    let rank = 1, mRank = 1, fRank = 1;
    const raceRanks: Record<string, number> = {};
    computed.forEach(r => {
      if (r.total !== undefined) {
        r.overall_rank = rank++;
        r.gender_rank = r.participant.gender === 'male' ? mRank++ : fRank++;
        const key = r.participant.race_id;
        r.race_rank = (raceRanks[key] || 0) + 1;
        raceRanks[key] = r.race_rank;
      }
    });

    setResults(computed);
  }

  function buildCertificateHTML(result: RankedResult, logoUrl?: string): string {
    const event = events.find(e => e.id === selectedEvent);
    const name = `${result.participant.first_name} ${result.participant.last_name}`;
    const year = event?.date ? new Date(event.date).getFullYear() : new Date().getFullYear();
    const raceName = result.race?.name?.replace(/שליחים\s*ו/, '') || '';
    const logo = logoUrl || event?.logo_url || '/logo.png';
    const fmt = (s?: number) => s ? formatTime(s) : '—';

    return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
    <title>תעודת סיום — ${name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      @page { size: A4 landscape; margin: 0; }
      body { width:297mm; height:210mm; font-family:'Arial','David',sans-serif; background:#fff; overflow:hidden; }
      .cert { width:297mm; height:210mm; position:relative; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; }

      /* border frame */
      .border-outer { position:absolute; inset:6mm; border:3px solid #1a3a6b; border-radius:4mm; }
      .border-inner { position:absolute; inset:9mm; border:1px solid #c9a84c; border-radius:3mm; }

      /* corner decorations */
      .corner { position:absolute; width:20mm; height:20mm; }
      .corner svg { width:100%; height:100%; }
      .tl { top:6mm; right:6mm; }
      .tr { top:6mm; left:6mm; transform:scaleX(-1); }
      .bl { bottom:6mm; right:6mm; transform:scaleY(-1); }
      .br { bottom:6mm; left:6mm; transform:scale(-1,-1); }

      /* gold stripe top */
      .gold-stripe { position:absolute; top:6mm; left:6mm; right:6mm; height:14mm; background:linear-gradient(135deg,#1a3a6b,#2a5298); border-radius:3mm 3mm 0 0; display:flex; align-items:center; justify-content:center; gap:8mm; }
      .gold-stripe-text { color:#f0d080; font-size:5mm; font-weight:bold; letter-spacing:1px; }
      .gold-dot { color:#c9a84c; font-size:4mm; }

      /* content */
      .content { position:relative; z-index:10; width:100%; display:flex; flex-direction:column; align-items:center; padding:18mm 20mm 14mm; }

      /* logo row */
      .logo-row { display:flex; align-items:center; justify-content:center; gap:6mm; margin-bottom:3mm; }
      .logo-img { width:18mm; height:18mm; object-fit:contain; }
      .logo-placeholder { width:18mm; height:18mm; background:#1a3a6b; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:7mm; font-weight:bold; }
      .event-name { text-align:center; color:#1a3a6b; }
      .event-name .line1 { font-size:6mm; font-weight:bold; }
      .event-name .line2 { font-size:4.5mm; }
      .event-name .year { font-size:4mm; color:#c9a84c; font-weight:bold; margin-top:1mm; }

      /* icons */
      .icons { display:flex; gap:5mm; margin-bottom:2mm; }
      .icon { font-size:6mm; }

      /* main title */
      .main-title { font-size:16mm; font-weight:900; color:#1a3a6b; letter-spacing:2px; line-height:1; margin:1mm 0; text-shadow:1px 1px 0 rgba(0,0,0,0.1); }
      .stars { color:#c9a84c; font-size:4mm; letter-spacing:3px; margin:1mm 0; }

      /* recipient */
      .recipient-label { font-size:4.5mm; color:#374151; margin-bottom:1mm; }
      .recipient-name { font-size:10mm; font-weight:bold; color:#1a3a6b; border-bottom:0.5mm solid #c9a84c; padding-bottom:1.5mm; min-width:100mm; text-align:center; margin-bottom:1.5mm; }
      .recipient-sub { font-size:4mm; color:#374151; margin-bottom:1mm; }
      .kol-hakavod { font-size:6mm; color:#c9a84c; font-style:italic; font-weight:bold; }

      /* race name */
      .race-badge { background:#eff6ff; border:1px solid #bfdbfe; border-radius:3mm; padding:1mm 4mm; font-size:3.5mm; color:#1d4ed8; margin:1.5mm 0; font-weight:600; }

      /* times */
      .times-row { display:flex; gap:0; margin:2mm 0; border:1px solid #e5e7eb; border-radius:3mm; overflow:hidden; }
      .time-cell { flex:1; text-align:center; padding:2mm 3mm; border-left:1px solid #e5e7eb; }
      .time-cell:last-child { border-left:none; }
      .time-icon { font-size:5mm; display:block; }
      .time-label { font-size:3mm; color:#6b7280; display:block; margin:0.5mm 0; }
      .time-value { font-size:4mm; font-weight:bold; color:#111827; font-family:monospace; border-top:0.5mm solid #d1d5db; padding-top:1mm; margin-top:1mm; }
      .time-cell.total { background:#1a3a6b; }
      .time-cell.total .time-label { color:#93c5fd; }
      .time-cell.total .time-value { color:#fde68a; border-color:#3b5998; }
      .time-cell.total .time-icon { filter:brightness(10); }

      /* signatures */
      .sigs { display:flex; justify-content:space-between; width:100%; margin-top:3mm; padding:0 10mm; }
      .sig { text-align:center; }
      .sig-line { width:40mm; border-bottom:0.5mm solid #374151; margin-bottom:1mm; height:6mm; }
      .sig-label { font-size:3mm; color:#6b7280; }

      /* medal */
      .medal { position:absolute; right:14mm; top:50%; transform:translateY(-50%); }
      .medal-circle { width:24mm; height:24mm; background:radial-gradient(circle at 35% 35%,#f0d080,#c9a84c,#8b6914); border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 2mm 4mm rgba(0,0,0,0.3); border:1mm solid #b8960c; }
      .medal-text { font-size:3.5mm; font-weight:900; color:#1a3a6b; text-align:center; line-height:1.2; }
      .medal-ribbon { width:8mm; height:10mm; background:linear-gradient(180deg,#1a3a6b,#2a5298); margin:0 auto -1mm; clip-path:polygon(0 0,100% 0,100% 80%,50% 100%,0 80%); }

      @media print { @page { size: A4 landscape; margin:0; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head>
    <body><div class="cert">
      <div class="border-outer"></div>
      <div class="border-inner"></div>

      <!-- gold top stripe -->
      <div class="gold-stripe">
        <span class="gold-stripe-text">טריאתלון יקנעם מושבה</span>
        <span class="gold-dot">★★★</span>
        <span class="gold-stripe-text">${year}</span>
      </div>

      <!-- medal -->
      <div class="medal">
        <div class="medal-ribbon"></div>
        <div class="medal-circle">
          <div class="medal-text">סיום<br/>TRI<br/>${year}</div>
        </div>
      </div>

      <!-- main content -->
      <div class="content">
        <div class="logo-row">
          ${logo ? `<img class="logo-img" src="${logo}" />` : `<div class="logo-placeholder">T</div>`}
          <div class="event-name">
            <div class="line1">טריאתלון</div>
            <div class="line2">יקנעם מושבה</div>
            <div class="year">★ ${year} ★</div>
          </div>
        </div>

        <div class="icons"><span class="icon">🏊</span><span class="icon">🚴</span><span class="icon">🏃</span></div>

        <div class="main-title">תעודת סיום</div>
        <div class="stars">★ ★ ★</div>

        <div class="recipient-label">מוענקת בזאת ל-</div>
        <div class="recipient-name">${name}</div>
        <div class="recipient-sub">על השתתפותך והשלמת המקצה בהצלחה!</div>
        <div class="kol-hakavod">כל הכבוד!</div>

        ${raceName ? `<div class="race-badge">${raceName}</div>` : ''}

        <div class="times-row">
          <div class="time-cell"><span class="time-icon">🏊</span><span class="time-label">שחייה</span><div class="time-value">${fmt(result.swim)}</div></div>
          <div class="time-cell"><span class="time-icon">🚴</span><span class="time-label">אופניים</span><div class="time-value">${fmt(result.bike)}</div></div>
          <div class="time-cell"><span class="time-icon">🏃</span><span class="time-label">ריצה</span><div class="time-value">${fmt(result.run)}</div></div>
          <div class="time-cell total"><span class="time-icon">🏅</span><span class="time-label">זמן כולל</span><div class="time-value">${fmt(result.total)}</div></div>
        </div>

        <div class="sigs">
          <div class="sig"><div class="sig-line"></div><div class="sig-label">יו"ר הוועדה המארגנת</div></div>
          <div class="sig"><div class="sig-line"></div><div class="sig-label">מנכ"ל האירוע</div></div>
        </div>
      </div>
    </div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;
  }

  function openCertificate(result: RankedResult) {
    const w = window.open('', '_blank');
    if (w) { w.document.write(buildCertificateHTML(result)); w.document.close(); }
    toast.success('תעודה נוצרה');
  }

  function openAllCertificates() {
    const finishers = filtered.filter(r => r.participant.status === 'finished');
    if (finishers.length === 0) { toast.error('אין משתתפים שסיימו'); return; }
    const event = events.find(e => e.id === selectedEvent);
    const logo = event?.logo_url || '';
    const year = event?.date ? new Date(event.date).getFullYear() : new Date().getFullYear();
    const pages = finishers.map(r => {
      const name = `${r.participant.first_name} ${r.participant.last_name}`;
      const raceName = r.race?.name?.replace(/שליחים\s*ו/, '') || '';
      const fmt = (s?: number) => s ? formatTime(s) : '—';
      return `<div class="cert" style="page-break-after:always">
        <div class="border-outer"></div><div class="border-inner"></div>
        <div class="gold-stripe"><span class="gold-stripe-text">טריאתלון יקנעם מושבה</span><span class="gold-dot">★★★</span><span class="gold-stripe-text">${year}</span></div>
        <div class="medal"><div class="medal-ribbon"></div><div class="medal-circle"><div class="medal-text">סיום<br/>TRI<br/>${year}</div></div></div>
        <div class="content">
          <div class="logo-row">${logo ? `<img class="logo-img" src="${logo}" />` : `<div class="logo-placeholder">T</div>`}<div class="event-name"><div class="line1">טריאתלון</div><div class="line2">יקנעם מושבה</div><div class="year">★ ${year} ★</div></div></div>
          <div class="icons"><span class="icon">🏊</span><span class="icon">🚴</span><span class="icon">🏃</span></div>
          <div class="main-title">תעודת סיום</div><div class="stars">★ ★ ★</div>
          <div class="recipient-label">מוענקת בזאת ל-</div>
          <div class="recipient-name">${name}</div>
          <div class="recipient-sub">על השתתפותך והשלמת המקצה בהצלחה!</div>
          <div class="kol-hakavod">כל הכבוד!</div>
          ${raceName ? `<div class="race-badge">${raceName}</div>` : ''}
          <div class="times-row">
            <div class="time-cell"><span class="time-icon">🏊</span><span class="time-label">שחייה</span><div class="time-value">${fmt(r.swim)}</div></div>
            <div class="time-cell"><span class="time-icon">🚴</span><span class="time-label">אופניים</span><div class="time-value">${fmt(r.bike)}</div></div>
            <div class="time-cell"><span class="time-icon">🏃</span><span class="time-label">ריצה</span><div class="time-value">${fmt(r.run)}</div></div>
            <div class="time-cell total"><span class="time-icon">🏅</span><span class="time-label">זמן כולל</span><div class="time-value">${fmt(r.total)}</div></div>
          </div>
          <div class="sigs"><div class="sig"><div class="sig-line"></div><div class="sig-label">יו"ר הוועדה המארגנת</div></div><div class="sig"><div class="sig-line"></div><div class="sig-label">מנכ"ל האירוע</div></div></div>
        </div></div>`;
    }).join('');

    // reuse CSS from buildCertificateHTML
    const dummy = buildCertificateHTML(finishers[0], logo);
    const styleMatch = dummy.match(/<style>([\s\S]*?)<\/style>/);
    const css = styleMatch ? styleMatch[1] : '';
    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>תעודות סיום</title><style>${css}</style></head><body>${pages}<script>window.onload=()=>window.print();<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    toast.success(`${finishers.length} תעודות נוצרו`);
  }

  // keep old fn for TS compatibility
  async function generateCertificatePDF(result: RankedResult) { openCertificate(result); }

  const filtered = results.filter(r => {
    const matchRace = !selectedRace || r.participant.race_id === selectedRace;
    const matchGender = !genderFilter || r.participant.gender === genderFilter;
    return matchRace && matchGender;
  });

  const rankIcon = (rank?: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? String(rank) : '—';

  return (
    <div style={S.page}>
      <div style={S.header}>
        <Trophy size={22} color="#eab308" />
        <span style={S.title}>תוצאות ודירוגים</span>
        <span style={{ marginRight: 'auto', fontSize: 13, color: '#6b7280' }}>{filtered.length} משתתפים</span>
        <button
          onClick={openAllCertificates}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a3a6b', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          🎓 כל התעודות
        </button>
      </div>

      <div style={S.filtersBar}>
        <select style={S.select} value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); setSelectedRace(''); }}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select style={S.select} value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
          <option value="">כל המקצים</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select style={S.select} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
          <option value="">כל המינים</option>
          <option value="male">גברים</option>
          <option value="female">נשים</option>
        </select>
      </div>

      <div style={S.tableWrap}>
        <div style={S.tableScroll}>
          <table style={S.table}>
            <thead>
              <tr>
                {['כללי','מקצה','מין','מס\'','שם','קטגוריה','🏊 שחייה','🚴 אופניים','🏃 ריצה','סה"כ','סטטוס',''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isPodium = (r.overall_rank || 0) <= 3 && r.overall_rank;
                return (
                  <tr key={r.participant.id} style={{ background: isPodium ? '#fefce8' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ ...S.tdBase, fontWeight: 800, fontSize: 16 }}>{rankIcon(r.overall_rank)}</td>
                    <td style={{ ...S.tdBase, color: '#6b7280' }}>{r.race_rank || '—'}</td>
                    <td style={{ ...S.tdBase, color: '#6b7280' }}>{r.gender_rank || '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#6b7280' }}>{r.participant.bib_number || '—'}</td>
                    <td style={{ ...S.tdBase, fontWeight: 600, color: '#111827' }}>{r.participant.first_name} {r.participant.last_name}</td>
                    <td style={{ ...S.tdBase, color: '#6b7280', fontSize: 12 }}>{r.race?.name}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#3b82f6', fontSize: 12 }}>{r.swim ? formatTime(r.swim) : '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#f97316', fontSize: 12 }}>{r.bike ? formatTime(r.bike) : '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', color: '#22c55e', fontSize: 12 }}>{r.run ? formatTime(r.run) : '—'}</td>
                    <td style={{ ...S.tdBase, fontFamily: 'monospace', fontWeight: 800, color: '#111827' }}>{r.total ? formatTime(r.total) : '—'}</td>
                    <td style={S.tdBase}>
                      <span style={statusBadge(r.participant.status)}>{statusLabel(r.participant.status)}</span>
                    </td>
                    <td style={S.tdBase}>
                      {r.participant.status === 'finished' && (
                        <button
                          onClick={() => generateCertificatePDF(r)}
                          style={{ fontSize: 12, background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'system-ui' }}
                        >
                          🎓 תעודה
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={S.empty}>אין תוצאות</div>}
        </div>
      </div>
    </div>
  );
}
