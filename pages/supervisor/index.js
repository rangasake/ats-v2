import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import { withAuth } from '../../lib/useAuth';
import { ROLES, INSPECTION_STATUS } from '../../lib/constants';
import { usePullToRefresh } from '../../lib/usePullToRefresh';

function SupervisorQueue() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(INSPECTION_STATUS.PENDING);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
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

  const filtered = filter === 'All'
    ? inspections
    : inspections.filter((i) => i.status === filter);

  const pendingCount  = inspections.filter((i) => i.status === INSPECTION_STATUS.PENDING).length;
  const pullState     = usePullToRefresh(fetchData);

  const todayStr     = new Date().toISOString().split('T')[0];
  const todayAll     = inspections.filter((i) => i.test_date === todayStr);
  const todayTotal   = todayAll.length;
  const todayApproved = todayAll.filter((i) => i.status === INSPECTION_STATUS.APPROVED).length;
  const todayRejected = todayAll.filter((i) => i.status === INSPECTION_STATUS.REJECTED).length;
  const todayPending  = todayAll.filter((i) => i.status === INSPECTION_STATUS.PENDING).length;

  return (
    <>
      <Head><title>Review Queue - AFTS</title></Head>
      <AppLayout title="Review Queue">
        {/* Pull-to-refresh indicator */}
        {(pullState === 'pulling' || pullState === 'refreshing') && (
          <div className="flex items-center justify-center gap-2 py-2 mb-2 text-blue-600 text-sm font-semibold">
            <span className={pullState === 'refreshing' ? 'animate-spin' : ''}>🔄</span>
            {pullState === 'refreshing' ? 'Refreshing...' : 'Release to refresh'}
          </div>
        )}
        {/* Today's Summary */}
        {!loading && todayTotal > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📅 Today’s Summary</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl py-2">
                <div className="text-lg font-extrabold text-gray-800">{todayTotal}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-yellow-50 rounded-xl py-2">
                <div className="text-lg font-extrabold text-yellow-700">{todayPending}</div>
                <div className="text-xs text-yellow-600">Pending</div>
              </div>
              <div className="bg-green-50 rounded-xl py-2">
                <div className="text-lg font-extrabold text-green-700">{todayApproved}</div>
                <div className="text-xs text-green-600">Approved</div>
              </div>
              <div className="bg-red-50 rounded-xl py-2">
                <div className="text-lg font-extrabold text-red-600">{todayRejected}</div>
                <div className="text-xs text-red-500">Rejected</div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Banner */}
        {pendingCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="text-2xl">⏳</div>
            <div>
              <div className="font-bold text-orange-800">{pendingCount} Pending Review</div>
              <div className="text-xs text-orange-600">Inspections awaiting your approval</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {['All', INSPECTION_STATUS.PENDING, INSPECTION_STATUS.APPROVED, INSPECTION_STATUS.REJECTED].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap
                ${filter === s ? 'bg-blue-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">✅</div>
            <p>No inspections in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((insp) => (
              <Link key={insp.inspection_id} href={
                insp.status === INSPECTION_STATUS.PENDING
                  ? `/supervisor/review/${insp.inspection_id}`
                  : `/inspection/${insp.inspection_id}`
              }>
                <div className="card flex items-start justify-between gap-3 cursor-pointer active:scale-98 transition-transform">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-800">{insp.vehicle_number || '—'}</span>
                      <StatusBadge status={insp.status} />
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {insp.lane_type && <div>Lane Type: {insp.lane_type}</div>}
                      {insp.test_date && <div>Test: {insp.test_date} · {insp.test_type}</div>}
                      <div>By: {insp.inspector_username}</div>
                    </div>
                  </div>
                  {insp.status === INSPECTION_STATUS.PENDING && (
                    <div className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full mt-1 whitespace-nowrap">
                      Review →
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AppLayout>
    </>
  );
}

export default withAuth(SupervisorQueue, [ROLES.SUPERVISOR, ROLES.ADMIN]);
