import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES, ADMIN_ROLES } from '../../lib/constants';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: ROLES.INSPECTOR, name: '', active: 'true' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetTarget, setResetTarget] = useState(null); // username
  const [resetPw, setResetPw] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // username

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('User created successfully');
      setShowForm(false);
      setForm({ username: '', password: '', role: ROLES.INSPECTOR, name: '', active: 'true' });
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function isActive(user) {
    const value = String(user.active || 'true').trim().toLowerCase();
    return ['true', 'active', 'yes', '1'].includes(value);
  }

  async function updateUserStatus(user, active) {
    const nextActive = active ? 'true' : 'false';
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setSuccess(`${user.username} marked ${active ? 'active' : 'inactive'}`);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteUser(user) {
    if (!confirm(`Delete user "${user.username}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, active: 'deleted' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setSuccess(`${user.username} deleted`);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateUserRole(user, role) {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      setSuccess(`${user.username} role changed to ${role}`);
      setEditingRole(null);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetPw.trim()) return;
    setResetSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetTarget, password: resetPw.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess(`Password reset for ${resetTarget}`);
      setResetTarget(null);
      setResetPw('');
    } catch (e) {
      setError(e.message);
    } finally {
      setResetSaving(false);
    }
  }

  return (
    <>
      <Head><title>User Management - AFTS</title></Head>
      <AppLayout title="User Management">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{users.length}/10 users</p>
          {users.length < 10 && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95"
            >
              {showForm ? 'Cancel' : '+ Add User'}
            </button>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">✅ {success}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">⚠️ {error}</div>
        )}

        {/* Add User Form */}
        {showForm && (
          <div className="card mb-4">
            <h2 className="section-title">➕ New User</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="form-input" required autoCapitalize="none" />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="form-input" required />
              </div>
              <div className="mb-4">
                <label className="form-label">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="form-input">
                  {Object.values(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        )}

        {/* User List */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.username} className="card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-gray-800">{u.name || u.username}</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${isActive(u) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {isActive(u) ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      @{u.username}
                      {editingRole === u.username ? (
                        <span className="flex items-center gap-2 mt-1">
                          <select
                            defaultValue={u.role}
                            onChange={(e) => updateUserRole(u, e.target.value)}
                            className="text-xs border border-blue-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                            autoFocus
                          >
                            {Object.values(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => setEditingRole(null)} className="text-xs text-gray-400">Cancel</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 ml-1">
                          <span className="text-gray-500">· {u.role}</span>
                          <button
                            onClick={() => setEditingRole(u.username)}
                            className="text-xs text-blue-500 underline"
                          >
                            change
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => { setResetTarget(resetTarget === u.username ? null : u.username); setResetPw(''); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      🔑 Reset PW
                    </button>
                    {!isActive(u) && (
                      <button
                        onClick={() => updateUserStatus(u, true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-green-50 text-green-700 border border-green-200"
                      >
                        Active
                      </button>
                    )}
                    {isActive(u) && (
                      <button
                        onClick={() => updateUserStatus(u, false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-gray-100 text-gray-600 border border-gray-200"
                      >
                        Inactive
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(u)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline reset password panel */}
                {resetTarget === u.username && (
                  <form onSubmit={handleResetPassword} className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      placeholder="New password"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      className="form-input flex-1 text-sm"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="submit"
                      disabled={resetSaving || !resetPw.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-800 text-white disabled:opacity-50"
                    >
                      {resetSaving ? '...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResetTarget(null); setResetPw(''); }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    </>
  );
}

export default withAuth(AdminUsers, ADMIN_ROLES);
