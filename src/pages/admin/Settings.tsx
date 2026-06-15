import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AppUser } from '../../lib/types';
import { Plus, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { toLoginEmail, isUsernameEmail, displayLogin } from '../../lib/utils';

const S = {
  page: { padding: '0 0 40px', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 700, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  card: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#111827' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  userRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', border: '1.5px solid #f3f4f6', borderRadius: 12, marginBottom: 8, background: '#fafafa' },
  userName: { fontSize: 14, fontWeight: 700, color: '#111827' },
  userEmail: { fontSize: 12, color: '#6b7280' },
  select: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#374151', background: 'white', outline: 'none', fontFamily: 'system-ui' },
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 380, padding: 24 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: '#111827' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', marginBottom: 14 },
  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  infoCard: { background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#1d4ed8' },
};

const roleLabel: Record<string, string> = { admin: '👑 מנהל', volunteer: '🙋 מתנדב מערכת', viewer: '👁️ צופה' };

export default function Settings() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'admin', assigned_station: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase.from('app_users').select('*').order('role');
    setUsers(data || []);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const loginEmail = toLoginEmail(newUser.email);
      const { data, error } = await supabase.auth.admin.createUser({ email: loginEmail, password: newUser.password, email_confirm: true });
      if (error) throw error;
      await supabase.from('app_users').insert({
        id: data.user.id,
        email: loginEmail,
        name: newUser.name,
        role: newUser.role,
        assigned_station: newUser.role === 'volunteer' && newUser.assigned_station ? Number(newUser.assigned_station) : null,
      });
      toast.success('משתמש נוצר');
      setShowAddUser(false);
      setShowPassword(false);
      setNewUser({ email: '', password: '', name: '', role: 'admin', assigned_station: '' });
      loadUsers();
    } catch (err: any) { toast.error(err.message || 'שגיאה ביצירת משתמש'); }
    finally { setSaving(false); }
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message || 'שגיאה בשליחת איפוס');
    else toast.success('קישור איפוס סיסמה נשלח');
  }

  async function updateRole(userId: string, role: string) {
    await supabase.from('app_users').update({ role }).eq('id', userId);
    toast.success('תפקיד עודכן');
    loadUsers();
  }

  async function updateStation(userId: string, station: string) {
    await supabase.from('app_users').update({ assigned_station: station ? Number(station) : null }).eq('id', userId);
    toast.success('תחנה עודכנה');
    loadUsers();
  }

  return (
    <div style={S.page}>
      <div style={S.title}>הגדרות מערכת</div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>משתמשי מערכת</span>
          <button style={S.addBtn} onClick={() => setShowAddUser(true)}>
            <Plus size={14} /> משתמש חדש
          </button>
        </div>

        {users.map(u => (
          <div key={u.id} style={S.userRow}>
            <div style={{ flex: 1 }}>
              <div style={S.userName}>{u.name || displayLogin(u.email)}</div>
              <div style={S.userEmail}>{displayLogin(u.email)}</div>
            </div>
            {u.role === 'admin' && !isUsernameEmail(u.email) && (
              <button
                type="button"
                onClick={() => sendPasswordReset(u.email)}
                title="שליחת קישור לאיפוס סיסמה"
                style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
              >
                <KeyRound size={14} />
              </button>
            )}
            <select style={S.select} value={u.role} onChange={e => updateRole(u.id, e.target.value)}>
              <option value="admin">מנהל</option>
              <option value="volunteer">מתנדב מערכת</option>
              <option value="viewer">צופה</option>
            </select>
            {u.role === 'volunteer' && (
              <select style={S.select} value={String(u.assigned_station || '')} onChange={e => updateStation(u.id, e.target.value)}>
                <option value="">תחנה</option>
                <option value="1">תחנה 1</option>
                <option value="2">תחנה 2</option>
                <option value="3">תחנה 3</option>
              </select>
            )}
            <span style={{ fontSize: 12, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {roleLabel[u.role] || u.role}
            </span>
          </div>
        ))}
      </div>

      <div style={S.infoCard}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>💡 הסבר</div>
        <div>
          <strong>משתמש מערכת</strong> — מי שצריך להיכנס לאפליקציה (מנהלים, מפעילי תחנות תיזמון).
          <br/>
          <strong>מתנדבים שעוזרים ביום האירוע</strong> (סדרני תנועה, שופטים וכו') מנוהלים בדף "מתנדבים" — אינם צריכים חשבון.
        </div>
      </div>

      {showAddUser && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>משתמש חדש</span>
              <button style={S.closeBtn} onClick={() => setShowAddUser(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addUser}>
              <label style={S.label}>שם</label>
              <input style={S.input} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="שם מלא" />
              <label style={S.label}>{newUser.role === 'admin' ? 'דוא"ל' : 'שם משתמש'}</label>
              <input
                style={S.input}
                type={newUser.role === 'admin' ? 'email' : 'text'}
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                required
                placeholder={newUser.role === 'admin' ? 'email@example.com' : 'לדוגמה: dani'}
                autoComplete="off"
              />
              {newUser.role !== 'admin' && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: -8, marginBottom: 14 }}>
                  ללא רווחים. ישמש לכניסה למערכת.
                </div>
              )}
              <label style={S.label}>סיסמה</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input
                  style={{ ...S.input, marginBottom: 0, paddingLeft: 40 }}
                  type={showPassword ? 'text' : 'password'}
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  required
                  placeholder="לפחות 6 תווים"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <label style={S.label}>תפקיד</label>
              <select style={{ ...S.input, marginBottom: 14 }} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="admin">מנהל</option>
                <option value="volunteer">מתנדב מערכת (תחנת תיזמון)</option>
                <option value="viewer">צופה</option>
              </select>
              {newUser.role === 'volunteer' && (
                <>
                  <label style={S.label}>תחנת תיזמון</label>
                  <select style={{ ...S.input, marginBottom: 14 }} value={newUser.assigned_station} onChange={e => setNewUser({...newUser, assigned_station: e.target.value})}>
                    <option value="">ללא</option>
                    <option value="1">תחנה 1 — יציאה משחייה</option>
                    <option value="2">תחנה 2 — סיום אופניים</option>
                    <option value="3">תחנה 3 — קו סיום</option>
                  </select>
                </>
              )}
              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={() => setShowAddUser(false)}>ביטול</button>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'יוצר...' : 'יצירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
