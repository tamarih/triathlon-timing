import React from 'react';

export const PP = {
  orange: '#ff7a18',
  red: '#d6002a',
  blue: '#1557b0',
  ink: '#0b1220',
  card: '#121a2b',
  line: 'rgba(255,255,255,0.10)',
  text: '#e8eefc',
  dim: '#9fb3d1',
  green: '#16a34a',
};

export const ppPage: React.CSSProperties = {
  minHeight: '100vh', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
  background: 'radial-gradient(1000px 500px at 50% -5%, #15224a 0%, #0b1220 55%, #050810 100%)',
  color: PP.text,
};

export const ppWrap: React.CSSProperties = { maxWidth: 560, margin: '0 auto', padding: '16px 16px 48px' };

export const ppCard: React.CSSProperties = {
  background: PP.card, border: `1px solid ${PP.line}`, borderRadius: 18, padding: 18,
  boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
};

export const ppInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: `1.5px solid ${PP.line}`, borderRadius: 12,
  padding: '13px 14px', fontSize: 16, background: '#0e1626', color: PP.text, outline: 'none',
  fontFamily: 'system-ui', marginBottom: 14,
};

export const ppLabel: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 700, color: PP.dim, marginBottom: 7 };

export const ppBtn = (bg: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: bg, color: 'white', border: 'none', borderRadius: 999, padding: '15px 22px',
  fontSize: 17, fontWeight: 900, cursor: 'pointer', width: '100%', textDecoration: 'none',
  boxShadow: '0 8px 24px rgba(214,0,42,0.35)',
});

// A little bouncing table-tennis ball animation.
export function BallAnim({ size = 54 }: { size?: number }) {
  return (
    <div style={{ height: size + 18, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
      <style>{`@keyframes ppbounce{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-${size * 0.6}px) rotate(180deg)}}
      @keyframes ppshadow{0%,100%{transform:scaleX(1);opacity:.35}50%{transform:scaleX(.5);opacity:.15}}`}</style>
      <div style={{ position: 'relative', width: size, textAlign: 'center' }}>
        <div style={{ fontSize: size, lineHeight: 1, animation: 'ppbounce 1.1s ease-in-out infinite' }}>🏓</div>
        <div style={{ width: size * 0.7, height: 8, margin: '2px auto 0', borderRadius: '50%', background: '#000', animation: 'ppshadow 1.1s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

export function ppCountdown(dateStr: string): string {
  const target = new Date(dateStr + 'T09:00:00').getTime();
  const diff = target - Date.now();
  if (diff <= 0) return 'הטורניר התחיל!';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `עוד ${days} ימים ו-${hours} שעות`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `עוד ${hours} שעות ו-${mins} דקות`;
}

export function ppFormatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}
