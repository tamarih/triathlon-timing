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
    <div className="min-h-screen bg-white" dir="rtl">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1a3a5c] via-[#1e5f74] to-[#0d7c66] text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-9xl">🏊</div>
          <div className="absolute top-20 right-20 text-8xl">🚴</div>
          <div className="absolute bottom-10 left-1/3 text-9xl">🏃</div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center gap-10">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-52 h-52 md:w-64 md:h-64 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center p-2 shadow-2xl">
              <img
                src="/logo.png"
                alt="טריאתלון יקנעם מושבה"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
          </div>

          {/* Text */}
          <div className="text-center md:text-right flex-1">
            <h1 className="text-5xl md:text-6xl font-black mb-2 leading-tight">
              טריאתלון
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-blue-200 mb-4">
              יקנעם מושבה
            </h2>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              האירוע הספורטיבי הגדול של הקהילה
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                to="/register"
                className="bg-white text-[#1a3a5c] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                🏁 הרשמה לאירוע
              </Link>
              <Link
                to="/results"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all"
              >
                🏆 תוצאות חיות
              </Link>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Disciplines */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          {[
            { icon: '🏊', title: 'שחייה', desc: 'בריכה או מים פתוחים', color: 'from-blue-400 to-blue-600' },
            { icon: '🚴', title: 'אופניים', desc: 'מסלול בדרכי הסביבה', color: 'from-green-400 to-green-600' },
            { icon: '🏃', title: 'ריצה', desc: 'עד קו הסיום', color: 'from-orange-400 to-orange-600' },
          ].map(item => (
            <div key={item.title} className={`bg-gradient-to-br ${item.color} rounded-2xl p-5 text-white text-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all`}>
              <div className="text-4xl md:text-5xl mb-2">{item.icon}</div>
              <div className="font-bold text-lg md:text-xl">{item.title}</div>
              <div className="text-sm opacity-80 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Events */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-7 bg-blue-600 rounded-full inline-block"></span>
          אירועים קרובים
        </h2>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3 animate-bounce">⏳</div>
            <p>טוען...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-4">🏁</div>
            <p className="text-gray-500 text-lg">אין אירועים פעילים כרגע</p>
            <p className="text-gray-400 text-sm mt-1">בקרו שוב בקרוב!</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow">
                {event.banner_url && (
                  <img src={event.banner_url} alt={event.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {event.status === 'open' && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">✅ פתוח להרשמה</span>
                        )}
                        {event.status === 'closed' && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">🔒 ההרשמה סגורה</span>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-4">{event.name}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={16} className="text-blue-500 flex-shrink-0" />
                          <span className="font-medium">{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} className="text-blue-500 flex-shrink-0" />
                          <span>{event.start_time?.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-gray-500 text-sm mt-3 leading-relaxed">{event.description}</p>
                      )}
                    </div>

                    {countdown[event.id] && (
                      <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 min-w-[120px] border border-blue-200">
                        <div className="text-xs text-blue-500 font-medium mb-1">⏱️ עד האירוע</div>
                        <div className="text-sm font-bold text-blue-700 leading-tight">{countdown[event.id]}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
                    {event.status === 'open' && (
                      <Link
                        to={`/register?event=${event.id}`}
                        className="flex-1 bg-gradient-to-l from-blue-600 to-blue-700 text-white text-center py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                      >
                        🏁 הרשמה עכשיו
                      </Link>
                    )}
                    <Link
                      to={`/results?event=${event.id}`}
                      className="flex-1 border-2 border-blue-200 text-blue-600 text-center py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                    >
                      🏆 תוצאות
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#1a3a5c] text-white/60 text-center py-6 text-sm">
        <img src="/logo.png" alt="לוגו" className="w-12 h-12 mx-auto mb-2 opacity-70" />
        טריאתלון יקנעם מושבה © 2025
      </footer>
    </div>
  );
}
