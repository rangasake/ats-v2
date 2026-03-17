import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES } from '../../lib/constants';

// Client-side page — calls API
function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Inspector', active: 'true' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/staff/list');
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create staff');
      setSuccess('Staff member added!');
      setShowForm(false);
      setForm({ name: '', role: 'Inspector', active: 'true' });
      fetchStaff();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head><title>Staff Management - AFTS</title></Head>
      <AppLayout title="Staff Management">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{staff.length} staff members</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            {showForm ? 'Cancel' : '+ Add Staff'}
          </button>
        </div>

        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">✅ {success}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">⚠️ {error}</div>}

        {showForm && (
          <div className="card mb-4">
            <h2 className="section-title">➕ Add Staff</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required />
              </div>
              <div className="mb-4">
                <label className="form-label">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="form-input">
                  <option value="Inspector">Lane Inspector</option>
                  <option value="Incharge">Lane Incharge</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add Staff'}</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">👨‍💼</div>
            <p>No staff added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((s, i) => (
              <div key={i} className="card flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">
                  {s.role === 'Incharge' ? '🧑‍💼' : '👷'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.role}</div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Active</span>
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    </>
  );
}

export default withAuth(AdminStaff, [ROLES.ADMIN]);