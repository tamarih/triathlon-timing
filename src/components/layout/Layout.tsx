import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Calendar, Users, Timer, FileText,
  LogOut, Menu, X, Trophy, Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const adminNav = [
  { to: '/admin', icon: Home, label: 'לוח בקרה' },
  { to: '/admin/events', icon: Calendar, label: 'אירועים' },
  { to: '/admin/participants', icon: Users, label: 'משתתפים' },
  { to: '/admin/timing', icon: Timer, label: 'מדידת זמנים' },
  { to: '/admin/results', icon: Trophy, label: 'תוצאות' },
  { to: '/admin/reports', icon: FileText, label: 'דוחות' },
  { to: '/admin/settings', icon: Settings, label: 'הגדרות' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { appUser, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Top nav */}
      <header className="bg-blue-700 text-white shadow-md z-40 relative">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-blue-600"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              🏊 טריאתלון קהילתי
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {appUser && (
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden md:inline opacity-80">{appUser.email}</span>
                <span className="bg-blue-500 px-2 py-0.5 rounded-full text-xs">
                  {appUser.role === 'admin' ? 'מנהל' : appUser.role === 'volunteer' ? 'מתנדב' : 'צופה'}
                </span>
                <button onClick={handleSignOut} className="p-1.5 hover:bg-blue-600 rounded-lg" title="התנתק">
                  <LogOut size={18} />
                </button>
              </div>
            )}
            {!appUser && (
              <Link to="/login" className="bg-white text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50">
                כניסה
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - admin/volunteer only */}
        {appUser && (
          <>
            <aside className={cn(
              'fixed inset-y-0 right-0 z-30 w-56 bg-white border-l border-gray-200 shadow-lg pt-16 transition-transform duration-200',
              'md:sticky md:top-0 md:translate-x-0 md:h-screen md:shadow-none',
              mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            )}>
              <nav className="p-3 space-y-1 overflow-y-auto h-full">
                {appUser.role === 'admin' && adminNav.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.to)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
                {appUser.role === 'volunteer' && (
                  <Link
                    to="/volunteer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700"
                  >
                    <Timer size={18} />
                    קליטת זמנים
                  </Link>
                )}
              </nav>
            </aside>
            {mobileOpen && (
              <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
            )}
          </>
        )}

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
