import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toLoginEmail } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #1e3a8a 0%, #0284c7 60%, #38bdf8 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    direction: 'rtl' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    backgroundColor: 'white',
    backgroundImage: 'url(/logo.png)',
    backgroundSize: '120%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    marginBottom: 20,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  } as React.CSSProperties,
  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: 800,
    margin: '0 0 4px',
    textAlign: 'center' as const,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    margin: '0 0 32px',
    textAlign: 'center' as const,
  },
  card: {
    background: 'white',
    borderRadius: 24,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    padding: '32px 28px',
    width: '100%',
    maxWidth: 360,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    border: '1.5px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#f9fafb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    fontSize: 13,
    padding: '10px 14px',
    borderRadius: 10,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  btn: {
    width: '100%',
    background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
    marginTop: 4,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(toLoginEmail(loginId), password);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: au } = await supabase.from('app_users').select('role').eq('id', session.user.id).single();
        navigate(au?.role === 'admin' ? '/admin' : '/volunteer');
      }
    } catch {
      setError('שם משתמש או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.logoWrap} role="img" aria-label="לוגו" />
      <h1 style={S.title}>כניסה למערכת</h1>
      <p style={S.subtitle}>טריאתלון יקנעם מושבה</p>

      <div style={S.card}>
        <form onSubmit={handleSubmit}>
          <div style={S.inputWrap}>
            <label style={S.label}>שם משתמש</label>
            <input
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              style={S.input}
              placeholder="הזינו שם משתמש"
              autoComplete="username"
              required
            />
          </div>
          <div style={S.inputWrap}>
            <label style={S.label}>סיסמה</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...S.input, paddingLeft: 40 }}
                placeholder="הזינו סיסמה"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div style={S.error}>{error}</div>}

          <button type="submit" disabled={loading} style={S.btn}>
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
