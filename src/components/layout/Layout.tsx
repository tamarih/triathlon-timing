import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Calendar, Users, Timer, FileText,
  LogOut, Menu, X, Trophy, Settings, HeartHandshake, ClipboardList, Package,
} from 'lucide-react';

const adminNav = [
  { to: '/admin', icon: Home, label: 'לוח בקרה' },
  { to: '/admin/events', icon: Calendar, label: 'אירועים' },
  { to: '/admin/participants', icon: Users, label: 'משתתפים' },
  { to: '/admin/volunteers', icon: HeartHandshake, label: 'מתנדבים' },
  { to: '/admin/roles', icon: ClipboardList, label: 'תפקידים' },
  { to: '/admin/equipment', icon: Package, label: 'ציוד' },
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

  const isActive = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);

  const navLinks = appUser?.role === 'admin' ? adminNav : appUser?.role === 'volunteer' ? [
    { to: '/volunteer', icon: Timer, label: 'קליטת זמנים' },
  ] : [];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', direction: 'rtl' }}>
      <style>{`
        .triath-sidebar { display: flex; }
        .triath-hamburger { display: none; }
        @media (max-width: 767px) {
          .triath-sidebar { display: none; }
          .triath-hamburger { display: flex !important; }
        }
        .triath-nav-link:hover { background: #f0f4ff !important; color: #1d4ed8 !important; }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
        color: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 16px',
          height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', direction: 'rtl',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, overflow: 'hidden',
            }}>
              <img src="/logo.png" alt="לוגו" style={{ width: '95%', height: '95%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>טריאתלון יקנעם</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {appUser ? (
              <>
                <span style={{
                  background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {appUser.role === 'admin' ? '👑 מנהל' : appUser.role === 'volunteer' ? '🙋 מתנדב' : '👁️ צופה'}
                </span>
                <button onClick={handleSignOut} style={{
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
                }}>
                  <LogOut size={15} />
                  יציאה
                </button>
                {navLinks.length > 0 && (
                  <button
                    className="triath-hamburger"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    style={{
                      background: 'rgba(255,255,255,0.15)', border: 'none',
                      borderRadius: 8, padding: 7, color: 'white', cursor: 'pointer',
                      alignItems: 'center',
                    }}
                  >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                )}
              </>
            ) : (
              <Link to="/login" style={{
                background: 'white', color: '#1e3a8a', border: 'none',
                borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
              }}>כניסה</Link>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: '#f1f5f9' }}>
        {/* Desktop Sidebar */}
        {appUser && navLinks.length > 0 && (
          <aside style={{
            width: 220, background: 'white', borderLeft: '1px solid #e5e7eb',
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
          }}>
            <nav style={{ padding: '12px 0' }}>
              {navLinks.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="triath-nav-link"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', margin: '2px 8px', borderRadius: 10,
                    fontSize: 14, fontWeight: isActive(item.to) ? 700 : 500,
                    color: isActive(item.to) ? '#1d4ed8' : '#374151',
                    background: isActive(item.to) ? '#eff6ff' : 'transparent',
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}
                >
                  <item.icon size={17} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {/* Mobile Sidebar */}
        {appUser && navLinks.length > 0 && mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 20,
              }}
            />
            <div style={{
              position: 'fixed', top: 60, right: 0, bottom: 0, width: 240,
              background: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
              zIndex: 30, overflowY: 'auto', padding: '12px 0',
            }}>
              {navLinks.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="triath-nav-link"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '13px 20px', fontSize: 15,
                    fontWeight: isActive(item.to) ? 700 : 500,
                    color: isActive(item.to) ? '#1d4ed8' : '#374151',
                    background: isActive(item.to) ? '#eff6ff' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
          </>
        )}

        <main style={{ flex: 1, minWidth: 0, padding: '24px 20px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
