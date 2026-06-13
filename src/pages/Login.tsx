import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    padding: 10,
  } as React.CSSProperties,
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/admin');
    } catch {
      setError('שם משתמש או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.logoWrap}>
        <img src="/logo.png" alt="לוגו" style={S.logo} />
      </div>
      <h1 style={S.title}>כניסה למערכת</h1>
      <p style={S.subtitle}>טריאתלון יקנעם מושבה</p>

      <div style={S.card}>
        <form onSubmit={handleSubmit}>
          <div style={S.inputWrap}>
            <label style={S.label}>דוא"ל</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={S.input}
              placeholder='הזינו דוא"ל'
              required
            />
          </div>
          <div style={S.inputWrap}>
            <label style={S.label}>סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={S.input}
              placeholder="הזינו סיסמה"
              required
            />
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
