import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES, ADMIN_ROLES } from '../../lib/constants';

// Client-side page — calls API
function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Inspector', active: 'true' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inspectionCounts, setInspectionCounts] = useState({});
  const [editingRole, setEditingRole] = useState(null); // staff name being edited

  useEffect(() => { fetchStaff(); fetchInspectionCounts(); }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
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

  async function updateStaffStatus(member, active) {
    const nextActive = active ? 'true' : 'false';
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: member.name, active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update staff');
      setSuccess(`${member.name} marked ${active ? 'active' : 'inactive'}`);
      fetchStaff();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateStaffRole(member, role) {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: member.name, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      setSuccess(`${member.name} role changed to ${role}`);
      setEditingRole(null);
      fetchStaff();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteStaff(member) {
    if (!confirm(`Delete staff member "${member.name}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: member.name, active: 'deleted' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete staff');
      setSuccess(`${member.name} deleted`);
      fetchStaff();
    } catch (e) {
      setError(e.message);
    }
  }

  async function fetchInspectionCounts() {
    try {
      const res  = await fetch('/api/inspection/list');
      const data = await res.json();
      const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const counts = {};
      (data.inspections || []).forEach((insp) => {
        if (!insp.test_date?.startsWith(thisMonth)) return;
        if (insp.lane_inspector) counts[insp.lane_inspector] = (counts[insp.lane_inspector] || 0) + 1;
        if (insp.lane_incharge)  counts[insp.lane_incharge]  = (counts[insp.lane_incharge]  || 0) + 1;
      });
      setInspectionCounts(counts);
    } catch {}
  }

  function isActive(member) {
    const value = String(member.active || 'true').trim().toLowerCase();
    return ['true', 'active', 'yes', '1'].includes(value);
  }

  return (
    <>
      <Head><title>Staff Management - AFTS</title></Head>
      <AppLayout title="Staff Management">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{staff.length} staff members</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold"
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
            {staff.map((s) => (
              <div key={s.name} className="card flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">
                  {s.role === 'Incharge' ? '🧑‍💼' : '👷'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${isActive(s) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {isActive(s) ? 'Active' : 'Inactive'}
                    </span>
                    {inspectionCounts[s.name] > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {inspectionCounts[s.name]} this month
                      </span>
                    )}
                  </div>
                  {editingRole === s.name ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <select
                        defaultValue={s.role}
                        onChange={(e) => updateStaffRole(s, e.target.value)}
                        className="text-xs border border-blue-300 rounded-lg px-2 py-1 bg-white focus:outline-none"
                        autoFocus
                      >
                        <option value="Inspector">Lane Inspector</option>
                        <option value="Incharge">Lane Incharge</option>
                      </select>
                      <button onClick={() => setEditingRole(null)} className="text-xs text-gray-400">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500">{s.role}</span>
                      <button
                        onClick={() => setEditingRole(s.name)}
                        className="text-xs text-blue-500 underline"
                      >
                        change
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {!isActive(s) && (
                    <button
                      onClick={() => updateStaffStatus(s, true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-green-50 text-green-700 border border-green-200"
                    >
                      Active
                    </button>
                  )}
                  {isActive(s) && (
                    <button
                      onClick={() => updateStaffStatus(s, false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      Inactive
                    </button>
                  )}
                  <button
                    onClick={() => deleteStaff(s)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    </>
  );
}

export default withAuth(AdminStaff, ADMIN_ROLES);
