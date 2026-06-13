import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AppUser } from '../../lib/types';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'volunteer', assigned_station: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase.from('app_users').select('*').order('role');
    setUsers(data || []);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
      });
      if (error) throw error;
      await supabase.from('app_users').insert({
        id: data.user.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        assigned_station: newUser.assigned_station ? Number(newUser.assigned_station) : null,
      });
      toast.success('משתמש נוצר');
      setShowAddUser(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה ביצירת משתמש');
    } finally {
      setSaving(false);
    }
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
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">הגדרות מערכת</h1>
      </div>

      {/* Users section */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">ניהול משתמשים</h2>
          <button onClick={() => setShowAddUser(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={15} /> משתמש חדש
          </button>
        </div>

        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{u.name || u.email}</div>
                <div className="text-sm text-gray-500">{u.email}</div>
              </div>
              <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="admin">מנהל</option>
                <option value="volunteer">מתנדב</option>
                <option value="viewer">צופה</option>
              </select>
              {u.role === 'volunteer' && (
                <select value={String(u.assigned_station || '')} onChange={e => updateStation(u.id, e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">תחנה</option>
                  <option value="1">תחנה 1</option>
                  <option value="2">תחנה 2</option>
                  <option value="3">תחנה 3</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add user modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">משתמש חדש</h3>
              <button onClick={() => setShowAddUser(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addUser} className="space-y-3">
              <Field label="שם" value={newUser.name} onChange={v => setNewUser({...newUser, name: v})} />
              <Field label='דוא"ל' type="email" value={newUser.email} onChange={v => setNewUser({...newUser, email: v})} required />
              <Field label="סיסמה" type="password" value={newUser.password} onChange={v => setNewUser({...newUser, password: v})} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תפקיד</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="admin">מנהל</option>
                  <option value="volunteer">מתנדב</option>
                  <option value="viewer">צופה</option>
                </select>
              </div>
              {newUser.role === 'volunteer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תחנה</label>
                  <select value={newUser.assigned_station} onChange={e => setNewUser({...newUser, assigned_station: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">ללא</option>
                    <option value="1">תחנה 1 — יציאה משחייה</option>
                    <option value="2">תחנה 2 — סיום אופניים</option>
                    <option value="3">תחנה 3 — קו סיום</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm">ביטול</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'יוצר...' : 'יצירה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <div className="font-medium mb-2">הגדרת Supabase</div>
        <p>יש להגדיר את קובץ <code className="bg-blue-100 px-1 rounded">.env</code> עם:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    </div>
  );
}
