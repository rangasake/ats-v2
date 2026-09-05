import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES, ADMIN_ROLES } from '../../lib/constants';

const TARGET_OPTIONS = [
  { value: 'All',        label: '🌐 Everyone (All roles)' },
  { value: 'Inspector',  label: '🔍 Inspectors only' },
  { value: 'Supervisor', label: '📋 Supervisors only' },
];

const ROLE_BADGE = {
  All:        'bg-blue-100 text-blue-700',
  Inspector:  'bg-green-100 text-green-700',
  Supervisor: 'bg-orange-100 text-orange-700',
};

function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [message, setMessage]             = useState('');
  const [targetRole, setTargetRole]       = useState('All');
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  useEffect(() => { fetchAnnouncements(); }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/announcements');
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const res  = await fetch('/api/admin/announcements', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: message.trim(), target_role: targetRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSuccess('Notification sent successfully!');
      setMessage('');
      fetchAnnouncements();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this notification?')) return;
    try {
      const res  = await fetch('/api/admin/announcements', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchAnnouncements();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <Head><title>Send Notifications - AFTS</title></Head>
      <AppLayout title="Send Notifications">

        {/* Compose Form */}
        <div className="card mb-4">
          <h2 className="section-title">📢 New Notification</h2>
          <form onSubmit={handleSend}>
            {/* Target audience */}
            <div className="mb-3">
              <label className="form-label">Send To</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTargetRole(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors
                      ${targetRole === opt.value
                        ? 'bg-blue-800 text-white border-blue-800'
                        : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="form-label">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Type your message or update here..."
                className="form-input resize-none"
                required
              />
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-3">
                ✅ {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-3">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={sending || !message.trim()} className="btn-primary">
              {sending ? 'Sending...' : '📤 Send Notification'}
            </button>
          </form>
        </div>

        {/* Sent Notifications List */}
        <div className="card">
          <h2 className="section-title">📋 Sent Notifications</h2>
          {loading ? (
            <div className="text-center py-6 text-gray-400">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-6 text-gray-400">No notifications sent yet</div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[a.target_role] || 'bg-gray-100 text-gray-500'}`}>
                          {a.target_role === 'All' ? '🌐 Everyone' : a.target_role}
                        </span>
                        <span className="text-xs text-gray-400">by {a.sent_by}</span>
                        {a.created_at && (
                          <span className="text-xs text-gray-400">
                            · {new Date(a.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{a.message}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0 mt-0.5"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </AppLayout>
    </>
  );
}

export default withAuth(AdminAnnouncements, ADMIN_ROLES);
