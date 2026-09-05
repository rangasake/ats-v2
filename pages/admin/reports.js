import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ADMIN_ROLES, INSPECTION_STATUS } from '../../lib/constants';

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'rto',      label: '🚗 Vehicles by RTO' },
  { id: 'mandal',   label: '📍 Vehicles by Mandal' },
];

function stat(label, value, color = 'text-gray-800') {
  return (
    <div className="card flex flex-col items-center py-4 px-3">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-1 text-center">{label}</span>
    </div>
  );
}

const inputCls =
  'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';

function DateFilter({ from, to, onFrom, onTo }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-gray-500 font-medium">Date Added:</span>
      <input type="date" className={inputCls} value={from} onChange={(e) => onFrom(e.target.value)} />
      <span className="text-gray-400 text-sm">to</span>
      <input type="date" className={inputCls} value={to} onChange={(e) => onTo(e.target.value)} />
      {(from || to) && (
        <button
          type="button"
          onClick={() => { onFrom(''); onTo(''); }}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function TableFooter({ label = 'Total', count }) {
  return (
    <tr className="border-t-2 border-blue-100 bg-blue-50">
      <td className="py-2.5 pr-2 font-bold text-blue-800">{label}</td>
      <td className="py-2.5 font-bold text-blue-800 text-right">{count}</td>
    </tr>
  );
}

function Reports() {
  const [tab, setTab]           = useState('overview');
  const [inspections, setInspections] = useState([]);
  const [vehicles, setVehicles]       = useState([]);
  const [loading, setLoading]         = useState(true);

  const [from, setFrom]               = useState('');
  const [to, setTo]                   = useState('');
  const [rtoFilter, setRtoFilter]     = useState('All');

  useEffect(() => {
    Promise.all([
      fetch('/api/inspection/list').then((r) => r.json()),
      fetch('/api/vehicle/list').then((r) => r.json()),
    ])
      .then(([iData, vData]) => {
        setInspections(iData.inspections || []);
        setVehicles(vData.vehicles || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ─── Overview (existing report) ────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const today  = inspections.filter((i) => i.test_date === todayStr);
  const month  = inspections.filter((i) => i.test_date?.startsWith(monthStr));

  const byStatus = (arr) => ({
    [INSPECTION_STATUS.APPROVED]:  arr.filter((i) => i.status === INSPECTION_STATUS.APPROVED).length,
    [INSPECTION_STATUS.REJECTED]:  arr.filter((i) => i.status === INSPECTION_STATUS.REJECTED).length,
    [INSPECTION_STATUS.PENDING]:   arr.filter((i) => i.status === INSPECTION_STATUS.PENDING).length,
    [INSPECTION_STATUS.DRAFT]:     arr.filter((i) => i.status === INSPECTION_STATUS.DRAFT).length,
  });

  const monthStatus = byStatus(month);

  const withResult = inspections.filter((i) => i.inspection_result);
  const passCount  = withResult.filter((i) => i.inspection_result === 'Pass').length;
  const failCount  = withResult.filter((i) => i.inspection_result === 'Fail').length;

  const inspectorCount = {};
  month.forEach((i) => {
    if (i.inspector_username) inspectorCount[i.inspector_username] = (inspectorCount[i.inspector_username] || 0) + 1;
  });
  const topInspectors = Object.entries(inspectorCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const laneCount = {};
  inspections.forEach((i) => {
    if (i.lane_type) laneCount[i.lane_type] = (laneCount[i.lane_type] || 0) + 1;
  });
  const laneEntries = Object.entries(laneCount).sort((a, b) => b[1] - a[1]);

  const now = Date.now();
  const expiringSoon = inspections.filter((i) => {
    if (i.status !== INSPECTION_STATUS.APPROVED || !i.test_date) return false;
    const exp = new Date(i.test_date); exp.setFullYear(exp.getFullYear() + 1);
    const days = Math.ceil((exp - now) / 86400000);
    return days >= 0 && days <= 30;
  });
  const expired = inspections.filter((i) => {
    if (i.status !== INSPECTION_STATUS.APPROVED || !i.test_date) return false;
    const exp = new Date(i.test_date); exp.setFullYear(exp.getFullYear() + 1);
    return exp < now;
  });

  // ─── Vehicles by RTO / Mandal ──────────────────────────────────────────
  const filteredVehicles = useMemo(() => {
    const fromD = from ? new Date(`${from}T00:00:00`) : null;
    const toD   = to   ? new Date(`${to}T23:59:59`)   : null;
    return vehicles.filter((v) => {
      if (!fromD && !toD) return true;
      const d = v.created_at ? new Date(v.created_at) : null;
      if (!d) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    });
  }, [vehicles, from, to]);

  const rtoEntries = useMemo(() => {
    const map = {};
    filteredVehicles.forEach((v) => {
      const rto = v.rto_office?.trim() || '—';
      map[rto] = (map[rto] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  }, [filteredVehicles]);

  const rtoOptions = useMemo(() => {
    const s = new Set(filteredVehicles.map((v) => v.rto_office?.trim()).filter(Boolean));
    return [...s].sort();
  }, [filteredVehicles]);

  const mandalEntries = useMemo(() => {
    const map = {};
    filteredVehicles.forEach((v) => {
      const rto = v.rto_office?.trim() || '—';
      if (rtoFilter !== 'All' && rto !== rtoFilter) return;
      const mandal = v.mandal_name?.trim() || '—';
      const key = rto + '|' + mandal;
      if (!map[key]) map[key] = { rto, mandal, count: 0 };
      map[key].count += 1;
    });
    return Object.values(map).sort(
      (a, b) => b.count - a.count || String(a.rto).localeCompare(String(b.rto)) || String(a.mandal).localeCompare(String(b.mandal))
    );
  }, [filteredVehicles, rtoFilter]);

  const rtoTotal    = rtoEntries.reduce((s, [, c]) => s + c, 0);
  const mandalTotal = mandalEntries.reduce((s, r) => s + r.count, 0);

  if (loading) return <AppLayout title="📊 Reports"><p className="text-gray-400 text-sm text-center py-12">Loading…</p></AppLayout>;

  return (
    <AppLayout title="📊 Reports">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'text-blue-700 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <h2 className="section-title mb-3">Today ({todayStr})</h2>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {stat('Total', today.length)}
            {stat('Approved', today.filter((i) => i.status === INSPECTION_STATUS.APPROVED).length, 'text-green-600')}
            {stat('Rejected', today.filter((i) => i.status === INSPECTION_STATUS.REJECTED).length, 'text-red-600')}
          </div>

          <h2 className="section-title mb-3">This Month ({monthStr})</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {stat('Total', month.length)}
            {stat('Approved', monthStatus[INSPECTION_STATUS.APPROVED], 'text-green-600')}
            {stat('Rejected', monthStatus[INSPECTION_STATUS.REJECTED], 'text-red-600')}
            {stat('Pending', monthStatus[INSPECTION_STATUS.PENDING], 'text-yellow-600')}
          </div>

          {withResult.length > 0 && (
            <>
              <h2 className="section-title mb-3">Pass / Fail Ratio (All Time)</h2>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {stat('✅ Pass', passCount, 'text-green-600')}
                {stat('❌ Fail', failCount, 'text-red-600')}
              </div>
            </>
          )}

          {(expiringSoon.length > 0 || expired.length > 0) && (
            <>
              <h2 className="section-title mb-3">Certificate Alerts</h2>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {stat('⚠️ Expiring (30d)', expiringSoon.length, 'text-orange-600')}
                {stat('🚨 Expired', expired.length, 'text-red-600')}
              </div>
            </>
          )}

          {topInspectors.length > 0 && (
            <>
              <h2 className="section-title mb-3">Top Inspectors (This Month)</h2>
              <div className="card mb-6 divide-y divide-gray-100">
                {topInspectors.map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {laneEntries.length > 0 && (
            <>
              <h2 className="section-title mb-3">Lane Type Distribution</h2>
              <div className="card mb-6 divide-y divide-gray-100">
                {laneEntries.map(([lane, count]) => (
                  <div key={lane} className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="font-medium text-gray-700">{lane}</span>
                    <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2.5 py-1 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'rto' && (
        <>
          <h2 className="section-title mb-3">🚗 Vehicle Count by RTO Office</h2>
          <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-2 font-semibold">RTO Office</th>
                    <th className="py-2 pr-2 font-semibold text-right">Vehicle Count</th>
                  </tr>
                </thead>
                <tbody>
                  {rtoEntries.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-gray-400">No vehicles found</td>
                    </tr>
                  ) : (
                    rtoEntries.map(([rto, count]) => (
                      <tr key={rto} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-2 font-medium text-gray-700">{rto}</td>
                        <td className="py-2 pr-2 text-right font-semibold text-gray-800">
                          <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2.5 py-1 rounded-full">{count}</span>
                        </td>
                      </tr>
                    ))
                  )}
                  <TableFooter label="Total" count={rtoTotal} />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'mandal' && (
        <>
          <h2 className="section-title mb-3">📍 Vehicle Count by Mandal</h2>
          <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-gray-500 font-medium">RTO Office:</span>
            <select
              className={inputCls}
              value={rtoFilter}
              onChange={(e) => setRtoFilter(e.target.value)}
            >
              <option value="All">All RTOs</option>
              {rtoOptions.map((rto) => (
                <option key={rto} value={rto}>{rto}</option>
              ))}
            </select>
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-2 font-semibold">RTO Office</th>
                    <th className="py-2 pr-2 font-semibold">Mandal</th>
                    <th className="py-2 pr-2 font-semibold text-right">Vehicle Count</th>
                  </tr>
                </thead>
                <tbody>
                  {mandalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">No vehicles found</td>
                    </tr>
                  ) : (
                    mandalEntries.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-2 font-medium text-gray-700">{r.rto}</td>
                        <td className="py-2 pr-2 text-gray-600">{r.mandal}</td>
                        <td className="py-2 pr-2 text-right font-semibold text-gray-800">
                          <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2.5 py-1 rounded-full">{r.count}</span>
                        </td>
                      </tr>
                    ))
                  )}
                  <TableFooter label="Total" count={mandalTotal} />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

export default withAuth(Reports, ADMIN_ROLES);