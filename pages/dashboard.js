import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/ui/StatusBadge';
import { withAuth } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import { INSPECTION_STATUS, ROLES } from '../lib/constants';
import { usePullToRefresh } from '../lib/usePullToRefresh';

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('All');
  const [searchText, setSearchText]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const dateFromRef = useRef(null);
  const dateToRef   = useRef(null);
  const today = new Date().toISOString().split('T')[0];

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

  const pullState = usePullToRefresh(fetchInspections);

  // Certificate validity = 1 year from test_date. Returns days left (negative = expired)
  function certDaysLeft(insp) {
    if (insp.status !== INSPECTION_STATUS.APPROVED || !insp.test_date) return null;
    const expiry = new Date(insp.test_date);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  }

  // Pool narrows by date range first; counts always reflect the current date-filtered pool
  const datePool = inspections.filter((i) => {
    if (dateFrom && i.test_date < dateFrom) return false;
    if (dateTo   && i.test_date > dateTo)   return false;
    return true;
  });
  const hasDateFilter = dateFrom || dateTo;

  const filtered = datePool.filter((i) => {
    if (searchText.trim() && !i.vehicle_number?.toUpperCase().includes(searchText.trim().toUpperCase())) return false;
    if (filter !== 'All' && i.status !== filter) return false;
    return true;
  });

  const counts = statusFilters.slice(1).reduce((acc, s) => {
    acc[s] = datePool.filter((i) => i.status === s).length;
    return acc;
  }, {});

  return (
    <>
      <Head><title>Dashboard - AFTS</title></Head>
      <AppLayout title="Dashboard">
        {/* Pull-to-refresh indicator */}
        {(pullState === 'pulling' || pullState === 'refreshing') && (
          <div className="flex items-center justify-center gap-2 py-2 mb-2 text-blue-600 text-sm font-semibold">
            <span className={pullState === 'refreshing' ? 'animate-spin' : ''}>🔄</span>
            {pullState === 'refreshing' ? 'Refreshing...' : 'Release to refresh'}
          </div>
        )}
        {/* Quick Actions */}
        {(user?.role === ROLES.INSPECTOR || user?.role === ROLES.ADMIN) && (
          <Link href="/inspection/new">
            <div className="bg-blue-600 text-white rounded-2xl p-4 mb-3 flex items-center gap-3 active:scale-98 transition-transform shadow-lg">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl">➕</div>
              <div>
                <div className="font-bold text-base">New Inspection</div>
                <div className="text-blue-200 text-sm">Start vehicle fitness check</div>
              </div>
            </div>
          </Link>
        )}

        {/* Review Queue — top shortcut for Supervisor/Admin */}
        {(user?.role === ROLES.SUPERVISOR || user?.role === ROLES.ADMIN) && (
          <Link href="/supervisor">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-center justify-between active:scale-98 transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">📋</div>
                <div>
                  <div className="font-bold text-orange-800">Review Queue</div>
                  <div className="text-xs text-orange-600">{counts[INSPECTION_STATUS.PENDING] || 0} pending review</div>
                </div>
              </div>
              <span className="text-orange-400 text-2xl">›</span>
            </div>
          </Link>
        )}

        {/* Stats — clickable filters */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {Object.entries(counts).map(([status, count]) => {
            const icons  = { Draft: '✏️', Pending: '⏳', Approved: '✅', Rejected: '❌' };
            const colors = { Draft: 'bg-gray-50', Pending: 'bg-yellow-50', Approved: 'bg-green-50', Rejected: 'bg-red-50' };
            const rings  = { Draft: 'ring-gray-400', Pending: 'ring-yellow-400', Approved: 'ring-green-500', Rejected: 'ring-red-400' };
            const isActive = filter === status;
            return (
              <button
                key={status}
                onClick={() => setFilter(isActive ? 'All' : status)}
                className={`${colors[status]} rounded-2xl p-4 border text-left transition-all active:scale-95 ${
                  isActive ? `border-transparent ring-2 ${rings[status]} shadow-md` : 'border-gray-100'
                }`}
              >
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="text-xs text-gray-600 mt-1">{icons[status]} {status}</div>
              </button>
            );
          })}
        </div>

        {/* Search & Date Filter */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search vehicle number…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            )}
          </div>
          <button
            onClick={() => setShowDateRange((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              hasDateFilter ? 'border-blue-500 bg-blue-50 text-blue-700' : showDateRange ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            📅
            {hasDateFilter && <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />}
          </button>
        </div>

        {/* Date Range Row */}
        {showDateRange && (
          <div className="flex gap-2 mb-2 items-center">
            <div
              className="flex-1 relative cursor-pointer"
              onClick={() => { try { dateFromRef.current?.showPicker(); } catch {} }}
            >
              <input
                ref={dateFromRef}
                type="date"
                value={dateFrom}
                max={dateTo || today}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full py-2 px-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  dateFrom ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 bg-white text-gray-500'
                }`}
                placeholder="From"
              />
              {!dateFrom && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">From</span>}
            </div>
            <span className="text-gray-400 text-xs shrink-0">→</span>
            <div
              className="flex-1 relative cursor-pointer"
              onClick={() => { try { dateToRef.current?.showPicker(); } catch {} }}
            >
              <input
                ref={dateToRef}
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                max={today}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full py-2 px-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  dateTo ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 bg-white text-gray-500'
                }`}
                placeholder="To"
              />
              {!dateTo && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">To</span>}
            </div>
            {hasDateFilter && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="shrink-0 w-7 h-7 bg-gray-200 text-gray-600 rounded-full text-sm flex items-center justify-center font-bold active:scale-95"
              >&times;</button>
            )}
          </div>
        )}
        {hasDateFilter && (
          <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 mb-3">
            📅 {dateFrom || '…'} → {dateTo || 'today'}{filter !== 'All' ? ` · ${filter}` : ''}
          </div>
        )}

        {/* Inspection List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>{hasDateFilter ? `No inspections in selected range` : searchText ? `No results for "${searchText}"` : 'No inspections found'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((insp) => (
              <div key={insp.inspection_id} className="relative">
                <Link href={`/inspection/${insp.inspection_id}`}>
                  <div className="card flex items-center justify-between gap-3 py-3 px-4 active:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 tracking-wide">{insp.vehicle_number || '—'}</span>
                        <StatusBadge status={insp.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                        {insp.test_date && <span>{insp.test_date}</span>}
                        {insp.test_date && (insp.inspector_username || insp.lane_type) && <span>·</span>}
                        {insp.inspector_username && <span>By {insp.inspector_username}</span>}
                        {insp.supervisor_username && (insp.status === INSPECTION_STATUS.APPROVED || insp.status === INSPECTION_STATUS.REJECTED) && (
                          <>
                            <span>·</span>
                            <span className="text-gray-600 font-medium">
                              {insp.status === INSPECTION_STATUS.APPROVED ? '☑️' : '❌'} {insp.supervisor_username}
                            </span>
                          </>
                        )}
                        {insp.lane_type && <><span>·</span><span>{insp.lane_type}</span></>}
                      </div>
                      {insp.status === INSPECTION_STATUS.REJECTED && insp.fail_reason && (
                        <div className="mt-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 font-medium">
                          ❌ Fail: {insp.fail_reason}
                        </div>
                      )}
                      {(() => {
                        const days = certDaysLeft(insp);
                        if (days === null) return null;
                        if (days < 0)  return <div className="mt-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-2 py-1 font-bold">🚨 Certificate Expired</div>;
                        if (days <= 30) return <div className="mt-1.5 text-xs text-orange-700 bg-orange-50 rounded-lg px-2 py-1 font-semibold">⚠️ Expires in {days}d</div>;
                        return null;
                      })()}
                    </div>
                    {/* Right */}
                    <div className="flex items-center gap-2 shrink-0">
                      {insp.status === INSPECTION_STATUS.APPROVED && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/inspection/${insp.inspection_id}?autoprint=1`);
                          }}
                          className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                          title="Print Certificate"
                        >
                          🖨️
                        </button>
                      )}
                      <span className="text-gray-300 text-lg">›</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Supervisor Quick Link removed — moved to top */}
      </AppLayout>
    </>
  );
}

export default withAuth(Dashboard);
