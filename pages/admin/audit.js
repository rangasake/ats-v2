import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES, ADMIN_ROLES } from '../../lib/constants';

const ACTION_STYLES = {
  APPROVE: 'bg-green-100 text-green-700',
  REJECT:  'bg-red-100 text-red-700',
  SUBMIT:  'bg-blue-100 text-blue-700',
  REOPEN:  'bg-yellow-100 text-yellow-700',
};

function AuditLog() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs || []); setLoading(false); })
      .catch(() => { setError('Failed to load audit log'); setLoading(false); });
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return !q || [l.actor, l.action, l.inspection_id, l.vehicle_number, l.details]
      .join(' ').toLowerCase().includes(q);
  });

  return (
    <AppLayout title="🗒️ Audit Log">
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search actor, action, vehicle, inspection ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
        />
      </div>

      {loading && <p className="text-gray-400 text-sm text-center py-8">Loading…</p>}
      {error   && <p className="text-red-500 text-sm text-center py-8">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No audit entries found.</p>
      )}

      <div className="space-y-2">
        {filtered.map((log, i) => {
          const ts = log.timestamp
            ? new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—';
          const badge = ACTION_STYLES[log.action] || 'bg-gray-100 text-gray-600';
          return (
            <div key={i} className="card py-3 px-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{log.action || '—'}</span>
                <span className="font-semibold text-sm text-gray-800">{log.actor || '—'}</span>
                <span className="text-xs text-gray-400 ml-auto">{ts}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {log.vehicle_number  && <span>🚗 {log.vehicle_number}</span>}
                {log.inspection_id   && <span>🔖 {log.inspection_id}</span>}
                {log.details         && <span className="text-gray-600">{log.details}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

export default withAuth(AuditLog, ADMIN_ROLES);
