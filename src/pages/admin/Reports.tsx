import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Event } from '../../lib/types';
import { formatTime, timeDiffSeconds, statusLabel, paymentLabel, genderLabel, calculateAge } from '../../lib/utils';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function Reports() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*').order('date', { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.length) setSelectedEvent(data[0].id);
    });
  }, []);

  async function fetchData() {
    if (!selectedEvent) return null;
    const [{ data: parts }, { data: timings }, { data: racesData }] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', selectedEvent),
      supabase.from('timing_records').select('*').eq('event_id', selectedEvent),
      supabase.from('races').select('*').eq('event_id', selectedEvent),
    ]);
    return { parts: parts || [], timings: timings || [], races: racesData || [] };
  }

  async function exportParticipantsExcel() {
    setLoading(true);
    const d = await fetchData();
    if (!d) { setLoading(false); return; }
    const data = d.parts.map(p => ({
      'מספר משתתף': p.bib_number || '',
      'שם פרטי': p.first_name, 'שם משפחה': p.last_name,
      'מין': genderLabel(p.gender),
      'גיל': p.age || (p.birth_date ? calculateAge(p.birth_date) : ''),
      'טלפון': p.phone, 'דוא"ל': p.email,
      'יישוב': p.city || '', 'קבוצה': p.club || '',
      'מקצה': d.races.find(r => r.id === p.race_id)?.name || '',
      'סטטוס': statusLabel(p.status), 'תשלום': paymentLabel(p.payment_status),
      'מידת חולצה': p.shirt_size || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'נרשמים');
    XLSX.writeFile(wb, 'participants.xlsx');
    toast.success('הורד בהצלחה');
    setLoading(false);
  }

  async function exportResultsExcel() {
    setLoading(true);
    const d = await fetchData();
    if (!d) { setLoading(false); return; }

    const rows = d.parts.map(p => {
      const race = d.races.find(r => r.id === p.race_id);
      const gunStr = race ? `1970-01-01T${race.gun_time}` : '';
      const t1 = d.timings.find(t => t.participant_id === p.id && t.station === 1);
      const t2 = d.timings.find(t => t.participant_id === p.id && t.station === 2);
      const t3 = d.timings.find(t => t.participant_id === p.id && t.station === 3);
      const swim = t1 && gunStr ? timeDiffSeconds(gunStr, t1.recorded_at) : null;
      const bike = t1 && t2 ? timeDiffSeconds(t1.recorded_at, t2.recorded_at) : null;
      const run = t2 && t3 ? timeDiffSeconds(t2.recorded_at, t3.recorded_at) : null;
      const total = t3 && gunStr ? timeDiffSeconds(gunStr, t3.recorded_at) : null;
      return {
        'מקצה': race?.name || '',
        'מספר': p.bib_number || '',
        'שם': `${p.first_name} ${p.last_name}`,
        'מין': genderLabel(p.gender),
        'שחייה': swim ? formatTime(swim) : '',
        'אופניים': bike ? formatTime(bike) : '',
        'ריצה': run ? formatTime(run) : '',
        'סה"כ': total ? formatTime(total) : '',
        'סטטוס': statusLabel(p.status),
      };
    }).sort((a, b) => (a['סה"כ'] || 'z') < (b['סה"כ'] || 'z') ? -1 : 1);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'תוצאות');
    XLSX.writeFile(wb, 'results.xlsx');
    toast.success('הורד בהצלחה');
    setLoading(false);
  }

  async function exportPaymentsExcel() {
    setLoading(true);
    const d = await fetchData();
    if (!d) { setLoading(false); return; }
    const data = d.parts.map(p => ({
      'מספר': p.bib_number || '',
      'שם': `${p.first_name} ${p.last_name}`,
      'טלפון': p.phone, 'דוא"ל': p.email,
      'מקצה': d.races.find(r => r.id === p.race_id)?.name || '',
      'מחיר': d.races.find(r => r.id === p.race_id)?.price || 0,
      'סטטוס תשלום': paymentLabel(p.payment_status),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'תשלומים');
    XLSX.writeFile(wb, 'payments.xlsx');
    toast.success('הורד בהצלחה');
    setLoading(false);
  }

  async function exportResultsPDF() {
    setLoading(true);
    const d = await fetchData();
    if (!d) { setLoading(false); return; }

    const doc = new jsPDF({ orientation: 'landscape' });
    const event = events.find(e => e.id === selectedEvent);
    doc.setFontSize(18);
    doc.text(event?.name || 'תוצאות טריאתלון', 14, 20);
    doc.setFontSize(11);
    doc.text(event ? `${event.date} | ${event.location}` : '', 14, 28);

    const rows = d.parts
      .filter(p => p.status === 'finished')
      .map((p, i) => {
        const race = d.races.find(r => r.id === p.race_id);
        const gunStr = race ? `1970-01-01T${race.gun_time}` : '';
        const t3 = d.timings.find(t => t.participant_id === p.id && t.station === 3);
        const total = t3 && gunStr ? timeDiffSeconds(gunStr, t3.recorded_at) : null;
        return [i + 1, p.bib_number || '', `${p.first_name} ${p.last_name}`, race?.name || '', genderLabel(p.gender), total ? formatTime(total) : ''];
      });

    autoTable(doc, {
      head: [['מקום', 'מספר', 'שם', 'מקצה', 'מין', 'זמן כולל']],
      body: rows,
      startY: 35,
    });

    doc.save('results.pdf');
    toast.success('הורד בהצלחה');
    setLoading(false);
  }

  const reportCards = [
    { title: 'רשימת נרשמים', desc: 'כל המשתתפים עם פרטים מלאים', icon: '👥', action: exportParticipantsExcel, type: 'Excel' },
    { title: 'תוצאות המרוץ', desc: 'זמנים ודירוגים לכל המשתתפים', icon: '🏆', action: exportResultsExcel, type: 'Excel' },
    { title: 'דוח תשלומים', desc: 'סטטוס תשלום לכל משתתף', icon: '💳', action: exportPaymentsExcel, type: 'Excel' },
    { title: 'תוצאות PDF', desc: 'תוצאות מוכנות להדפסה', icon: '📄', action: exportResultsPDF, type: 'PDF' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">דוחות וייצוא</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">אירוע</label>
        <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportCards.map(card => (
          <button
            key={card.title}
            onClick={card.action}
            disabled={loading || !selectedEvent}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-right hover:shadow-md disabled:opacity-50 transition-shadow flex items-center gap-4"
          >
            <div className="text-4xl">{card.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{card.title}</div>
              <div className="text-sm text-gray-500 mt-0.5">{card.desc}</div>
              <div className={`text-xs mt-1 font-medium ${card.type === 'PDF' ? 'text-red-500' : 'text-green-600'}`}>
                {card.type === 'PDF' ? '📄 PDF' : '📊 Excel'}
              </div>
            </div>
            <Download size={18} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
