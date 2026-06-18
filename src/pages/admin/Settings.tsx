import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AppUser } from '../../lib/types';
import { Plus, X, Eye, EyeOff, KeyRound, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { toLoginEmail, isUsernameEmail, displayLogin } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const S = {
  page: { padding: '0 0 40px', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 700, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 },
  card: { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#111827' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  userRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px', border: '1.5px solid #f3f4f6', borderRadius: 12, marginBottom: 8, background: '#fafafa' },
  userName: { fontSize: 14, fontWeight: 700, color: '#111827' },
  userEmail: { fontSize: 12, color: '#6b7280' },
  iconBtn: (color: string): React.CSSProperties => ({ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color, display: 'flex', alignItems: 'center' }),
  overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: 380, padding: 24, maxHeight: '90vh', overflowY: 'auto' as const },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: '#111827' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, background: '#f9fafb', fontFamily: 'system-ui', marginBottom: 14 },
  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { flex: 1, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  infoCard: { background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#1d4ed8' },
  roleBadge: { fontSize: 12, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontWeight: 600, whiteSpace: 'nowrap' as const },
};

const roleLabel: Record<string, string> = { admin: '👑 מנהל', volunteer: '🙋 מתנדב', viewer: '👁️ צופה' };

type EditState = { id: string; name: string; role: string; assigned_station: string; pool_lanes: number[]; newPassword: string };

function RoleBlocks({ poolLanes, station, onPoolChange, onStationChange }: {
  poolLanes: number[]; station: string;
  onPoolChange: (v: number[]) => void; onStationChange: (v: string) => void;
}) {
  const isPool = poolLanes.length > 0;
  const isTiming = !!station;
  const blockStyle = (active: boolean): React.CSSProperties => ({
    border: `2px solid ${active ? '#3b82f6' : '#e5e7eb'}`,
    borderRadius: 12, padding: '10px 14px', marginBottom: 10,
    background: active ? '#eff6ff' : '#f9fafb', cursor: 'pointer',
  });
  return (
    <>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>תפקידים (ניתן לבחור כמה)</label>
      {/* Pool block */}
      <div style={blockStyle(isPool)} onClick={() => onPoolChange(isPool ? [] : [1])}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isPool} onChange={() => {}} style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>🏊 שופט בריכה</span>
        </div>
        {isPool && (
          <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>מסלולים:</div>
            <LaneCheckboxes value={poolLanes} onChange={onPoolChange} />
          </div>
        )}
      </div>
      {/* Timing block */}
      <div style={blockStyle(isTiming)} onClick={() => onStationChange(isTiming ? '' : '1')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isTiming} onChange={() => {}} style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>⏱️ שופט תיזמון</span>
        </div>
        {isTiming && (
          <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>תחנה:</div>
            <select style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: 'white', outline: 'none', fontFamily: 'system-ui', width: '100%' }}
              value={station} onChange={e => onStationChange(e.target.value)}>
              <option value="1">תחנה 1 — יציאה משחייה</option>
              <option value="2">תחנה 2 — סיום אופניים</option>
              <option value="3">תחנה 3 — קו סיום</option>
            </select>
          </div>
        )}
      </div>
    </>
  );
}

function LaneCheckboxes({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  function toggle(lane: number) {
    onChange(value.includes(lane) ? value.filter(l => l !== lane) : [...value, lane].sort());
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {[1,2,3,4,5,6].map(l => (
        <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
          background: value.includes(l) ? '#eff6ff' : '#f9fafb',
          border: `1.5px solid ${value.includes(l) ? '#3b82f6' : '#e5e7eb'}`,
          borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600,
          color: value.includes(l) ? '#1d4ed8' : '#374151' }}>
          <input type="checkbox" checked={value.includes(l)} onChange={() => toggle(l)} style={{ display: 'none' }} />
          🏊 מסלול {l}
        </label>
      ))}
    </div>
  );
}

export default function Settings() {
  const { appUser: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'admin', assigned_station: '', pool_lanes: [] as number[] });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editUser, setEditUser] = useState<EditState | null>(null);
  const [showEditPass, setShowEditPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      const { data, error } = await supabase.rpc('create_app_user', {
        p_email: loginEmail, p_password: newUser.password,
        p_name: newUser.name, p_role: newUser.role,
        p_station: newUser.assigned_station ? Number(newUser.assigned_station) : null,
      });
      if (!error && !data?.error && newUser.pool_lanes.length > 0) {
        await supabase.from('app_users').update({ pool_lanes: newUser.pool_lanes }).eq('email', loginEmail);
      }
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('משתמש נוצר');
      setShowAddUser(false);
      setShowPassword(false);
      setNewUser({ email: '', password: '', name: '', role: 'admin', assigned_station: '', pool_lanes: [] });
      loadUsers();
    } catch (err: any) { toast.error(err.message || 'שגיאה ביצירת משתמש'); }
    finally { setSaving(false); }
  }

  function openEdit(u: AppUser) {
    setEditUser({
      id: u.id, name: u.name || '', role: u.role,
      assigned_station: u.assigned_station ? String(u.assigned_station) : '',
      pool_lanes: (u as any).pool_lanes || (u.pool_lane ? [u.pool_lane] : []),
      newPassword: '',
    });
    setShowEditPass(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      await supabase.from('app_users').update({
        name: editUser.name, role: editUser.role,
        assigned_station: editUser.assigned_station ? Number(editUser.assigned_station) : null,
        pool_lanes: editUser.pool_lanes.length > 0 ? editUser.pool_lanes : null,
        pool_lane: editUser.pool_lanes.length === 1 ? editUser.pool_lanes[0] : editUser.pool_lanes[0] || null,
      }).eq('id', editUser.id);

      if (editUser.newPassword) {
        const { error } = await supabase.rpc('change_user_password', { p_user_id: editUser.id, p_new_password: editUser.newPassword });
        if (error) throw new Error('עדכון פרטים הצליח אך שינוי סיסמה נכשל: ' + error.message);
      }
      toast.success('משתמש עודכן');
      setEditUser(null);
      loadUsers();
    } catch (err: any) { toast.error(err.message || 'שגיאה בעדכון'); }
    finally { setSaving(false); }
  }

  async function deleteUser() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_app_user', { p_user_id: confirmDelete.id });
      if (error) throw error;
      toast.success('משתמש נמחק');
      setConfirmDelete(null);
      loadUsers();
    } catch (err: any) { toast.error(err.message || 'שגיאה במחיקה'); }
    finally { setDeleting(false); }
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message || 'שגיאה בשליחת איפוס');
    else toast.success('קישור איפוס סיסמה נשלח');
  }

  const newIsPool = newUser.pool_lanes.length > 0;
  const newIsTiming = !!newUser.assigned_station;

  return (
    <div style={S.page}>
      <div style={S.title}>הגדרות מערכת</div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>משתמשי מערכת</span>
          <button style={S.addBtn} onClick={() => setShowAddUser(true)}><Plus size={14} /> משתמש חדש</button>
        </div>

        {users.map(u => {
          const lanes: number[] = (u as any).pool_lanes || (u.pool_lane ? [u.pool_lane] : []);
          return (
            <div key={u.id} style={S.userRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.userName}>{u.name || displayLogin(u.email)}</div>
                <div style={S.userEmail}>
                  {displayLogin(u.email)}
                  {[lanes.length > 0 ? `🏊 מסלולים: ${lanes.join(', ')}` : '', u.assigned_station ? `⏱️ תחנה ${u.assigned_station}` : ''].filter(Boolean).join(' · ') || ''}
                </div>
              </div>
              <span style={S.roleBadge}>{roleLabel[u.role] || u.role}</span>
              {u.role === 'admin' && !isUsernameEmail(u.email) && (
                <button type="button" onClick={() => sendPasswordReset(u.email)} title="איפוס סיסמה" style={S.iconBtn('#6b7280')}>
                  <KeyRound size={14} />
                </button>
              )}
              <button type="button" onClick={() => openEdit(u)} title="עריכה" style={S.iconBtn('#1d4ed8')}><Pencil size={14} /></button>
              {u.id !== currentUser?.id && u.role !== 'admin' && (
                <button type="button" onClick={() => setConfirmDelete(u)} title="מחיקה" style={S.iconBtn('#dc2626')}><Trash2 size={14} /></button>
              )}
            </div>
          );
        })}
      </div>

      <div style={S.infoCard}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>💡 הסבר</div>
        <div>
          <strong>משתמש מערכת</strong> — מי שצריך להיכנס לאפליקציה (מנהלים, מפעילי תחנות תיזמון).
          <br/>
          <strong>מתנדבים שעוזרים ביום האירוע</strong> מנוהלים בדף "מתנדבים" — אינם צריכים חשבון.
        </div>
      </div>

      {/* Add User Modal */}
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
              <input style={S.input} type={newUser.role === 'admin' ? 'email' : 'text'}
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                required placeholder={newUser.role === 'admin' ? 'email@example.com' : 'לדוגמה: dani'} autoComplete="off" />
              {newUser.role !== 'admin' && <div style={{ fontSize: 11, color: '#6b7280', marginTop: -8, marginBottom: 14 }}>ללא רווחים. ישמש לכניסה למערכת.</div>}
              <label style={S.label}>סיסמה</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input style={{ ...S.input, marginBottom: 0, paddingLeft: 40 }}
                  type={showPassword ? 'text' : 'password'} value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})} required placeholder="לפחות 6 תווים" />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <label style={S.label}>תפקיד</label>
              <select style={{ ...S.input, marginBottom: 14 }} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value, pool_lanes: [], assigned_station: ''})}>
                <option value="admin">מנהל</option>
                <option value="volunteer">מתנדב מערכת</option>
                <option value="viewer">צופה</option>
              </select>
              {newUser.role === 'volunteer' && (
                <>
                  <RoleBlocks
                    poolLanes={newUser.pool_lanes}
                    station={newUser.assigned_station}
                    onPoolChange={v => setNewUser({...newUser, pool_lanes: v})}
                    onStationChange={v => setNewUser({...newUser, assigned_station: v})}
                  />
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

      {/* Edit User Modal */}
      {editUser && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>עריכת משתמש</span>
              <button style={S.closeBtn} onClick={() => setEditUser(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveEdit}>
              <label style={S.label}>שם</label>
              <input style={S.input} value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} placeholder="שם מלא" />

              <label style={S.label}>תפקיד</label>
              {editUser.role === 'admin' ? (
                <div style={{ ...S.input, color: '#6b7280', background: '#f3f4f6', cursor: 'not-allowed' }}>👑 מנהל</div>
              ) : (
                <select style={{ ...S.input, marginBottom: 14 }} value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}>
                  <option value="volunteer">מתנדב מערכת</option>
                  <option value="viewer">צופה</option>
                </select>
              )}

              {editUser.role === 'volunteer' && (
                <RoleBlocks
                  poolLanes={editUser.pool_lanes}
                  station={editUser.assigned_station}
                  onPoolChange={v => setEditUser({...editUser, pool_lanes: v})}
                  onStationChange={v => setEditUser({...editUser, assigned_station: v})}
                />
              )}

              <label style={S.label}>סיסמה חדשה (השאר ריק לא לשנות)</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input style={{ ...S.input, marginBottom: 0, paddingLeft: 40 }}
                  type={showEditPass ? 'text' : 'password'} value={editUser.newPassword}
                  onChange={e => setEditUser({...editUser, newPassword: e.target.value})}
                  placeholder="סיסמה חדשה (אופציונלי)" autoComplete="new-password" />
                <button type="button" onClick={() => setShowEditPass(s => !s)}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex', alignItems: 'center' }}>
                  {showEditPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={() => setEditUser(null)}>ביטול</button>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? 'שומר...' : 'שמירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 340 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>מחיקת משתמש</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                למחוק את <strong>{confirmDelete.name || displayLogin(confirmDelete.email)}</strong>?<br />פעולה זו אינה הפיכה.
              </div>
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => setConfirmDelete(null)}>ביטול</button>
              <button style={S.btnDanger} onClick={deleteUser} disabled={deleting}>{deleting ? 'מוחק...' : 'מחיקה'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
