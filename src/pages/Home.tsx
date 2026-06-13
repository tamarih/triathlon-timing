import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event } from '../lib/types';
import { formatDate, countdownString } from '../lib/utils';
import { Calendar, MapPin, ChevronLeft } from 'lucide-react';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('events').select('*').in('status', ['open', 'closed']).order('date').then(({ data }) => {
      setEvents(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const c: Record<string, string> = {};
      events.forEach(e => { c[e.id] = countdownString(e.date, e.start_time); });
      setCountdown(c);
    }, 1000);
    return () => clearInterval(interval);
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Hero */}
      <section className="bg-[#0f2744] text-white">
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-8 flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="טריאתלון יקנעם מושבה"
            className="w-32 h-32 object-contain mb-5"
          />
          <h1 className="text-3xl font-black mb-1">טריאתלון יקנעם מושבה</h1>
          <p className="text-blue-300 text-base mb-7">האירוע הספורטיבי הגדול של הקהילה</p>

          <div className="flex gap-3 w-full max-w-xs">
            <Link to="/register"
              className="flex-1 bg-blue-500 hover:bg-blue-400 text-white text-center py-3 rounded-xl font-bold text-sm transition-colors">
              הרשמה
            </Link>
            <Link to="/results"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white text-center py-3 rounded-xl font-bold text-sm border border-white/20 transition-colors">
              תוצאות
            </Link>
          </div>
        </div>

        {/* Disciplines strip */}
        <div className="border-t border-white/10">
          <div className="max-w-2xl mx-auto px-5 py-4 flex justify-around">
            {[
              { icon: '🏊', label: 'שחייה' },
              { icon: '🚴', label: 'אופניים' },
              { icon: '🏃', label: 'ריצה' },
            ].map(d => (
              <div key={d.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{d.icon}</span>
                <span className="text-xs text-blue-300 font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">אירועים קרובים</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">טוען...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-4xl mb-2">🏁</div>
            <p className="text-gray-400 text-sm">אין אירועים פעילים כרגע</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {event.banner_url && (
                  <img src={event.banner_url} alt={event.name} className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          event.status === 'open'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {event.status === 'open' ? 'פתוח להרשמה' : 'סגור'}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug mb-2">{event.name}</h3>
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-blue-400" />
                          <span>{formatDate(event.date)} · {event.start_time?.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-blue-400" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>

                    {countdown[event.id] && (
                      <div className="text-center bg-blue-50 rounded-xl p-2.5 flex-shrink-0 min-w-[80px]">
                        <div className="text-[10px] text-blue-400 mb-0.5">עד האירוע</div>
                        <div className="text-xs font-bold text-blue-700 leading-tight">{countdown[event.id]}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    {event.status === 'open' && (
                      <Link to={`/register?event=${event.id}`}
                        className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                        הרשמה
                      </Link>
                    )}
                    <Link to={`/results?event=${event.id}`}
                      className="flex-1 border border-gray-200 text-gray-600 text-center py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                      תוצאות <ChevronLeft size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400">
        טריאתלון יקנעם מושבה © 2025
      </footer>
    </div>
  );
}
