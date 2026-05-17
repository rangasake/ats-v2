// pages/admin/devices.js
import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES } from '../../lib/constants';

function AdminDevices() {
  const [devices, setDevices]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ device_name: '', device_description: '' });
  const [saving, setSaving]         = useState(false);
  const [newToken, setNewToken]     = useState(null); // shown once after creation/regen
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { fetchDevices(); }, []);

  async function fetchDevices() {
    setLoading(true);
    try {
      const res  = await fetch('/api/devices/list');
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setNewToken(null);
    try {
      const res  = await fetch('/api/devices/manage', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewToken({ token: data.token, device_name: data.device_name });
      setShowForm(false);
      setForm({ device_name: '', device_description: '' });
      fetchDevices();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleAction(device_name, action) {
    setActionLoading(device_name + action);
    setError('');
    setSuccess('');
    setNewToken(null);
    try {
      const res  = await fetch('/api/devices/manage', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ device_name, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.new_token) {
        setNewToken({ token: data.new_token, device_name });
      } else {
        setSuccess(`${action === 'revoke' ? 'Revoked' : 'Activated'}: ${device_name}`);
      }
      fetchDevices();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(''); }
  }

  const activeCount  = devices.filter((d) => d.status === 'active').length;
  const revokedCount = devices.filter((d) => d.status === 'revoked').length;

  return (
    <>
      <Head><title>Device Management — AFTS</title></Head>
      <AppLayout title="Device Management">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <div className="text-2xl font-bold text-gray-800">{activeCount}</div>
            <div className="text-xs text-gray-600 mt-1">✅ Active Devices</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <div className="text-2xl font-bold text-gray-800">{revokedCount}</div>
            <div className="text-xs text-gray-600 mt-1">🚫 Revoked</div>
          </div>
        </div>

        {/* Add button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{devices.length} total devices</p>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setNewToken(null); }}
            className="bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95"
          >
            {showForm ? 'Cancel' : '+ New Device'}
          </button>
        </div>

        {/* New device form */}
        {showForm && (
          <div className="card mb-4">
            <h2 className="section-title">➕ Register New Device</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-3">
                <label className="form-label">Device Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.device_name}
                  onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Inspector Phone 1, Supervisor Tablet"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={form.device_description}
                  onChange={(e) => setForm({ ...form, device_description: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Samsung Galaxy A14, Lane 2 tablet"
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Generating Token...' : '🔑 Generate Token'}
              </button>
            </form>
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">⚠️ {error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">✅ {success}</div>
        )}

        {/* New token reveal — shown once */}
        {newToken && (
          <div className="bg-blue-900 text-white rounded-2xl p-4 mb-4 border border-blue-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔑</span>
              <span className="font-bold">Token for "{newToken.device_name}"</span>
            </div>
            <div className="bg-black/30 rounded-xl p-3 font-mono text-xs break-all mb-3 select-all">
              {newToken.token}
            </div>
            <p className="text-xs text-blue-300 mb-3">
              ⚠️ Copy this token now — it will not be shown again in full. Give it to the device user to paste in the registration page.
            </p>
            <button
              onClick={() => navigator.clipboard?.writeText(newToken.token).then(() => setSuccess('Copied!'))}
              className="w-full bg-white text-blue-900 font-bold py-2 rounded-xl text-sm active:scale-95"
            >
              📋 Copy Token
            </button>
          </div>
        )}

        {/* Device list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📱</div>
            <p>No devices registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((d) => {
              const isActive  = d.status === 'active';
              const isLoading = actionLoading.startsWith(d.device_name);
              return (
                <div key={d.device_name} className={`card border-l-4 ${isActive ? 'border-l-green-500' : 'border-l-red-400'}`}>
                  {/* Device info */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800">{d.device_name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                          ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {isActive ? '✅ Active' : '🚫 Revoked'}
                        </span>
                      </div>
                      {d.device_description && (
                        <div className="text-xs text-gray-500 mt-0.5">{d.device_description}</div>
                      )}
                      {d.last_seen && (
                        <div className="text-xs text-gray-400 mt-0.5">Last seen: {d.last_seen}</div>
                      )}
                    </div>
                  </div>

                  {/* Token preview */}
                  <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-500 mb-3 break-all">
                    {d.token}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {isActive ? (
                      <button
                        onClick={() => handleAction(d.device_name, 'revoke')}
                        disabled={isLoading}
                        className="flex-1 py-2 rounded-xl border-2 border-red-300 text-red-600 text-xs font-bold active:scale-95 disabled:opacity-50"
                      >
                        🚫 Revoke
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(d.device_name, 'activate')}
                        disabled={isLoading}
                        className="flex-1 py-2 rounded-xl border-2 border-green-400 text-green-700 text-xs font-bold active:scale-95 disabled:opacity-50"
                      >
                        ✅ Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(d.device_name, 'regenerate')}
                      disabled={isLoading}
                      className="flex-1 py-2 rounded-xl border-2 border-blue-300 text-blue-700 text-xs font-bold active:scale-95 disabled:opacity-50"
                    >
                      🔄 New Token
                    </button>
                  </div>
                  {isLoading && (
                    <div className="text-center text-xs text-gray-400 mt-2">Processing...</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* How-to guide */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h3 className="font-bold text-blue-800 text-sm mb-2">📖 How to add a new device</h3>
          <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Click <strong>"+ New Device"</strong> and give it a name (e.g. "Inspector Phone 2")</li>
            <li>Copy the generated token — it's shown <strong>only once</strong></li>
            <li>On the new device, open the app — it will show the registration page</li>
            <li>Paste the token and tap <strong>"Register Device"</strong></li>
            <li>Done — the device now has permanent access</li>
          </ol>
          <div className="mt-3 text-xs text-blue-600 font-semibold">
            To block a device: tap <strong>Revoke</strong> — takes effect within 5 minutes.<br/>
            To replace a lost device: tap <strong>New Token</strong> — old token immediately stops working.
          </div>
        </div>
      </AppLayout>
    </>
  );
}

export default withAuth(AdminDevices, [ROLES.ADMIN]);