import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/ui/StatusBadge';
import { withAuth } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import { INSPECTION_STATUS, ROLES } from '../lib/constants';

function Dashboard() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const statusFilters = ['All', ...Object.values(INSPECTION_STATUS)];

  useEffect(() => {
    fetchInspections();
  }, []);

  async function fetchInspections() {
    setLoading(true);
    try {
      const res = await fetch('/api/inspection/list');
      const data = await res.json();
      setInspections(data.inspections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'All' ? inspections : inspections.filter((i) => i.status === filter);

  const counts = statusFilters.slice(1).reduce((acc, s) => {
    acc[s] = inspections.filter((i) => i.status === s).length;
    return acc;
  }, {});

  return (
    <>
      <Head><title>Dashboard - AFTS</title></Head>
      <AppLayout title="Dashboard">
        {/* Quick Actions */}
        {(user?.role === ROLES.INSPECTOR || user?.role === ROLES.ADMIN) && (
          <Link href="/inspection/new">
            <div className="bg-blue-600 text-white rounded-2xl p-4 mb-4 flex items-center gap-3 active:scale-98 transition-transform shadow-lg">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl">➕</div>
              <div>
                <div className="font-bold text-base">New Inspection</div>
                <div className="text-blue-200 text-sm">Start vehicle fitness check</div>
              </div>
            </div>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {Object.entries(counts).map(([status, count]) => {
            const icons = { Draft: '✏️', Pending: '⏳', Approved: '✅', Rejected: '❌' };
            const colors = { Draft: 'bg-gray-50', Pending: 'bg-yellow-50', Approved: 'bg-green-50', Rejected: 'bg-red-50' };
            return (
              <div key={status} className={`${colors[status]} rounded-2xl p-4 border border-gray-100`}>
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="text-xs text-gray-600 mt-1">{icons[status]} {status}</div>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors
                ${filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Inspection List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>No inspections found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((insp) => (
              <Link key={insp.inspection_id} href={`/inspection/${insp.inspection_id}`}>
                <div className="card flex items-start justify-between gap-3 active:scale-98 transition-transform cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-800">{insp.vehicle_number || '—'}</span>
                      <StatusBadge status={insp.status} />
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {insp.lane_type && <div>Lane: {insp.lane_type}</div>}
                      {insp.test_date && <div>Test Date: {insp.test_date}</div>}
                      {insp.inspector_username && <div>By: {insp.inspector_username}</div>}
                    </div>
                  </div>
                  <div className="text-gray-400 text-lg mt-1">›</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Supervisor Quick Link */}
        {(user?.role === ROLES.SUPERVISOR || user?.role === ROLES.ADMIN) && (
          <Link href="/supervisor">
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-orange-800">Review Queue</div>
                <div className="text-xs text-orange-600">{counts[INSPECTION_STATUS.PENDING] || 0} pending review</div>
              </div>
              <span className="text-2xl">›</span>
            </div>
          </Link>
        )}
      </AppLayout>
    </>
  );
}

export default withAuth(Dashboard);
