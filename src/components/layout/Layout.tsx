import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Calendar, Users, Timer, FileText,
  LogOut, Menu, X, Trophy, Settings,
} from 'lucide-react';

const adminNav = [
  { to: '/admin', icon: Home, label: 'לוח בקרה' },
  { to: '/admin/events', icon: Calendar, label: 'אירועים' },
  { to: '/admin/participants', icon: Users, label: 'משתתפים' },
  { to: '/admin/timing', icon: Timer, label: 'מדידת זמנים' },
  { to: '/admin/results', icon: Trophy, label: 'תוצאות' },
  { to: '/admin/reports', icon: FileText, label: 'דוחות' },
  { to: '/admin/settings', icon: Settings, label: 'הגדרות' },
];

const S = {
  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
    color: 'white',
    boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 40,
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 16px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    direction: 'rtl' as const,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    color: 'white',
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  siteName: {
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '-0.3px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8,
    padding: '6px 10px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
  },
  loginBtn: {
    background: 'white',
    color: '#1e3a8a',
    border: 'none',
    borderRadius: 8,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  menuBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: 8,
    padding: 7,
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
  },
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 60px)',
    direction: 'rtl' as const,
    background: '#f1f5f9',
  },
  sidebar: {
    width: 220,
    background: 'white',
    borderLeft: '1px solid #e5e7eb',
    boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  navItem: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    margin: '2px 8px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: active ? '#1d4ed8' : '#374151',
    background: active ? '#eff6ff' : 'transparent',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  main: {
    flex: 1,
    minWidth: 0,
    padding: '24px 20px',
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 20,
  },
  mobileSidebar: (open: boolean): React.CSSProperties => ({
    position: 'fixed' as const,
    top: 60,
    right: 0,
    bottom: 0,
    width: 240,
    background: 'white',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
    zIndex: 30,
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.2s ease',
    overflowY: 'auto' as const,
    padding: '12px 0',
  }),
};

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
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <Link to="/" style={S.logoArea}>
            <div style={S.logoCircle}>
              <img src="/logo.png" alt="לוגו" style={S.logoImg} />
            </div>
            <span style={S.siteName}>טריאתלון יקנעם</span>
          </Link>

          <div style={S.headerRight}>
            {appUser ? (
              <>
                <span style={S.roleBadge}>
                  {appUser.role === 'admin' ? '👑 מנהל' : appUser.role === 'volunteer' ? '🙋 מתנדב' : '👁️ צופה'}
                </span>
                <button onClick={handleSignOut} style={S.logoutBtn}>
                  <LogOut size={15} />
                  יציאה
                </button>
              </>
            ) : (
              <Link to="/login" style={S.loginBtn}>כניסה</Link>
            )}
            {appUser && (
              <button style={S.menuBtn} onClick={() => setMobileOpen(!mobileOpen)}
                className="md-hide">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={S.layout}>
        {/* Desktop sidebar */}
        {appUser && navLinks.length > 0 && (
          <aside style={{ ...S.sidebar, display: 'none' }} className="desktop-sidebar">
            <nav style={{ padding: '12px 0' }}>
              {navLinks.map(item => (
                <Link key={item.to} to={item.to} style={S.navItem(isActive(item.to))}>
                  <item.icon size={17} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {/* Mobile sidebar */}
        {appUser && navLinks.length > 0 && (
          <>
            {mobileOpen && <div style={S.overlay} onClick={() => setMobileOpen(false)} />}
            <div style={S.mobileSidebar(mobileOpen)}>
              <nav>
                {navLinks.map(item => (
                  <Link key={item.to} to={item.to}
                    style={S.navItem(isActive(item.to))}
                    onClick={() => setMobileOpen(false)}>
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </>
        )}

        <main style={S.main}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .md-hide { display: none !important; }
        }
      `}</style>
    </div>
  );
}
