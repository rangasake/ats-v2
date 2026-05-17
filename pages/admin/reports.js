import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES, INSPECTION_STATUS } from '../../lib/constants';

function stat(label, value, color = 'text-gray-800') {
  return (
    <div className="card flex flex-col items-center py-4 px-3">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-1 text-center">{label}</span>
    </div>
  );
}

function Reports() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch('/api/inspection/list')
      .then((r) => r.json())
      .then((d) => { setInspections(d.inspections || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="📊 Reports"><p className="text-gray-400 text-sm text-center py-12">Loading…</p></AppLayout>;

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7); // YYYY-MM

  const today  = inspections.filter((i) => i.test_date === todayStr);
  const month  = inspections.filter((i) => i.test_date?.startsWith(monthStr));

  const byStatus = (arr) => ({
    [INSPECTION_STATUS.APPROVED]:  arr.filter((i) => i.status === INSPECTION_STATUS.APPROVED).length,
    [INSPECTION_STATUS.REJECTED]:  arr.filter((i) => i.status === INSPECTION_STATUS.REJECTED).length,
    [INSPECTION_STATUS.PENDING]:   arr.filter((i) => i.status === INSPECTION_STATUS.PENDING).length,
    [INSPECTION_STATUS.DRAFT]:     arr.filter((i) => i.status === INSPECTION_STATUS.DRAFT).length,
  });

  const monthStatus = byStatus(month);

  // Pass/Fail ratio from inspection_result (only Approved/Rejected with a result)
  const withResult = inspections.filter((i) => i.inspection_result);
  const passCount  = withResult.filter((i) => i.inspection_result === 'Pass').length;
  const failCount  = withResult.filter((i) => i.inspection_result === 'Fail').length;

  // Top inspectors this month
  const inspectorCount = {};
  month.forEach((i) => {
    if (i.inspector_username) inspectorCount[i.inspector_username] = (inspectorCount[i.inspector_username] || 0) + 1;
  });
  const topInspectors = Object.entries(inspectorCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Lane type distribution (all time)
  const laneCount = {};
  inspections.forEach((i) => {
    if (i.lane_type) laneCount[i.lane_type] = (laneCount[i.lane_type] || 0) + 1;
  });
  const laneEntries = Object.entries(laneCount).sort((a, b) => b[1] - a[1]);

  // Certificate expiry alerts (approved inspections)
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

  return (
    <AppLayout title="📊 Reports">
      {/* Today snapshot */}
      <h2 className="section-title mb-3">Today ({todayStr})</h2>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {stat('Total', today.length)}
        {stat('Approved', today.filter((i) => i.status === INSPECTION_STATUS.APPROVED).length, 'text-green-600')}
        {stat('Rejected', today.filter((i) => i.status === INSPECTION_STATUS.REJECTED).length, 'text-red-600')}
      </div>

      {/* This month */}
      <h2 className="section-title mb-3">This Month ({monthStr})</h2>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {stat('Total', month.length)}
        {stat('Approved', monthStatus[INSPECTION_STATUS.APPROVED], 'text-green-600')}
        {stat('Rejected', monthStatus[INSPECTION_STATUS.REJECTED], 'text-red-600')}
        {stat('Pending', monthStatus[INSPECTION_STATUS.PENDING], 'text-yellow-600')}
      </div>

      {/* Pass / Fail ratio */}
      {withResult.length > 0 && (
        <>
          <h2 className="section-title mb-3">Pass / Fail Ratio (All Time)</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {stat('✅ Pass', passCount, 'text-green-600')}
            {stat('❌ Fail', failCount, 'text-red-600')}
          </div>
        </>
      )}

      {/* Certificate expiry */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <>
          <h2 className="section-title mb-3">Certificate Alerts</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {stat('⚠️ Expiring (30d)', expiringSoon.length, 'text-orange-600')}
            {stat('🚨 Expired', expired.length, 'text-red-600')}
          </div>
        </>
      )}

      {/* Top inspectors */}
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

      {/* Lane type distribution */}
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
    </AppLayout>
  );
}

export default withAuth(Reports, [ROLES.ADMIN]);
