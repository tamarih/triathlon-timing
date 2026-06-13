import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event } from '../lib/types';
import { formatDate, countdownString } from '../lib/utils';
import { Calendar, MapPin, Clock } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50" dir="rtl">
      {/* Hero */}
      <section className="bg-gradient-to-l from-blue-700 to-blue-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-4">🏊‍♂️🚴‍♀️🏃‍♂️</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">טריאתלון קהילתי</h1>
          <p className="text-xl opacity-90 mb-8">הצטרפו לאירוע הספורטיבי הגדול של הקהילה</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-700 px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              הרשמה לאירוע
            </Link>
            <Link
              to="/results"
              className="bg-blue-600 text-white border-2 border-white/30 px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-500 transition-colors"
            >
              תוצאות חיות
            </Link>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">אירועים קרובים</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">טוען...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm">
            <div className="text-4xl mb-3">🏁</div>
            <p>אין אירועים פעילים כרגע</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                {event.banner_url && (
                  <img src={event.banner_url} alt={event.name} className="w-full h-40 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {event.status === 'open' && (
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">פתוח להרשמה</span>
                        )}
                        {event.status === 'closed' && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">ההרשמה סגורה</span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{event.name}</h3>
                      <div className="space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-blue-500" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-blue-500" />
                          <span>{event.start_time?.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-blue-500" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-gray-600 text-sm mt-3">{event.description}</p>
                      )}
                    </div>
                    {countdown[event.id] && (
                      <div className="text-center bg-blue-50 rounded-xl p-3 min-w-[110px]">
                        <div className="text-xs text-blue-500 mb-1">עד האירוע</div>
                        <div className="text-sm font-bold text-blue-700">{countdown[event.id]}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                    {event.status === 'open' && (
                      <Link
                        to={`/register?event=${event.id}`}
                        className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        הרשמה
                      </Link>
                    )}
                    <Link
                      to={`/results?event=${event.id}`}
                      className="flex-1 border border-blue-200 text-blue-600 text-center py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                    >
                      תוצאות
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Info sections */}
      <section className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🏊', title: 'שחייה', desc: 'פתיחה בבריכה או במים פתוחים' },
            { icon: '🚴', title: 'אופניים', desc: 'מסלול אופניים בדרכי הסביבה' },
            { icon: '🏃', title: 'ריצה', desc: 'ריצה לקו הסיום' },
          ].map(item => (
            <div key={item.title} className="text-center">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
