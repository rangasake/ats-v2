import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/layout/AppLayout';
import StatusBadge from '../../../components/ui/StatusBadge';
import { withAuth } from '../../../lib/useAuth';
import { ROLES, VISUAL_CHECKLIST_ITEMS, INSPECTION_STATUS } from '../../../lib/constants';

function safeParseJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function SupervisorReview() {
  const router = useRouter();
  const { id } = router.query;
  const [inspection, setInspection] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agentPhone, setAgentPhone] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentLookingUp, setAgentLookingUp] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [savingAgent, setSavingAgent] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [inspectionResult, setInspectionResult] = useState('');
  const [failReason, setFailReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const iRes = await fetch(`/api/inspection/get?id=${id}`);
      const iData = await iRes.json();
      if (iData.inspection) {
        setInspection(iData.inspection);
        const vRes = await fetch(`/api/vehicle/search?vehicle_number=${iData.inspection.vehicle_number}`);
        const vData = await vRes.json();
        if (vData.found) setVehicle(vData.vehicle);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function lookupAgent() {
    if (!agentPhone || agentPhone.length < 10) return;
    setAgentLookingUp(true);
    setNewAgentName('');
    try {
      const res = await fetch(`/api/supervisor/agent-lookup?phone=${agentPhone}`);
      const data = await res.json();
      if (data.found) setAgentName(data.agent.name || '');
      else setAgentName('');
    } catch (e) {}
    finally { setAgentLookingUp(false); }
  }

  async function saveNewAgent() {
    if (!newAgentName.trim()) return;
    setSavingAgent(true);
    try {
      const res = await fetch('/api/supervisor/agent-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: agentPhone, name: newAgentName.trim() }),
      });
      if (res.ok) {
        setAgentName(newAgentName.trim());
        setNewAgentName('');
      }
    } catch (e) {}
    finally { setSavingAgent(false); }
  }

  async function handleAction(action) {
    setSubmitting(true);
    setError('');

    if (!inspectionResult) {
      setError('Please select Inspection Result (Pass or Fail) before proceeding.');
      setSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    if (inspectionResult === 'Fail' && !failReason.trim()) {
      setError('Please enter a Fail Reason before rejecting.');
      setSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    try {
      const res = await fetch('/api/supervisor/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id:      id,
          action,
          agent_phone:        agentPhone,
          agent_name:         agentName,
          booking_id:         bookingId.trim().toUpperCase(),
          supervisor_remarks: remarks,
          inspection_result:  inspectionResult,
          fail_reason:        inspectionResult === 'Fail' ? failReason.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push(`/inspection/${id}?reviewed=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const visualData = inspection ? safeParseJSON(inspection.visual_data, {}) : {};

  if (loading) return <AppLayout title="Review"><div className="text-center py-16 text-gray-400">Loading...</div></AppLayout>;
  if (!inspection) return <AppLayout title="Not Found"><div className="text-center py-16 text-gray-400">Not found</div></AppLayout>;

  return (
    <>
      <Head><title>Review {id} - AFTS</title></Head>
      <AppLayout title="Review Inspection">
        {/* Header */}
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-extrabold text-gray-800">{inspection.vehicle_number}</div>
              <div className="text-xs text-gray-500 mt-0.5">ID: {inspection.inspection_id}</div>
            </div>
            <StatusBadge status={inspection.status} />
          </div>
          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
            {inspection.lane_type && <span>🛣️ {inspection.lane_type}</span>}
            {inspection.test_date && <span>📅 {inspection.test_date}</span>}
            <span>By: {inspection.inspector_username}</span>
          </div>
        </div>

        {/* Vehicle */}
        {vehicle && (
          <div className="card mb-4">
            <h2 className="section-title">🚗 Vehicle</h2>
            <Row label="Owner" value={vehicle.owner_name} />
            <Row label="Phone" value={vehicle.owner_phone} />
            <Row label="Engine No." value={vehicle.engine_number} />
            <Row label="Chassis No." value={vehicle.chassis_number} />
            <Row label="Meter Reading" value={vehicle.meter_reading ? `${vehicle.meter_reading} KM` : ''} />
            <Row label="Mandal / RTO" value={`${vehicle.mandal_name} / ${vehicle.rto_office}`} />
          </div>
        )}

        {/* Documents */}
        <div className="card mb-4">
          <h2 className="section-title">📄 Documents</h2>
          <Row label="Test Type" value={inspection.test_type} />
          <Row label="AFMS Receipt" value={inspection.afms_free_receipt} />
          <Row label="RC" value={inspection.rc} />
          <Row label="PUC / Expiry" value={`${inspection.puc || '-'} / ${inspection.puc_expiry || '-'}`} />
          <Row label="Insurance / Expiry" value={`${inspection.insurance || '-'} / ${inspection.insurance_expiry || '-'}`} />
          <Row label="Insurance Co." value={inspection.insurance_company} />
        </div>

        {/* Visual */}
        {Object.keys(visualData).length > 0 && (
          <div className="card mb-4">
            <h2 className="section-title">🔍 Visual Test</h2>
            <Row label="Vehicle Location" value={inspection.lat_long} />
            {VISUAL_CHECKLIST_ITEMS.map((item) => {
              const val = visualData[item.id];
              if (!val) return null;
              return (
                <div key={item.id} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`font-semibold ${val === 'Yes' ? 'text-green-600' : 'text-red-500'}`}>{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Staff */}
        <div className="card mb-4">
          <h2 className="section-title">👨‍💼 Staff & Feedback</h2>
          <Row label="Inspector" value={inspection.lane_inspector} />
          <Row label="Incharge" value={inspection.lane_incharge} />
          <Row label="Remarks" value={inspection.remarks} />
          <Row label="Feedback" value={inspection.feedback} />
        </div>

        {/* Supervisor Input */}
        <div className="card mb-4">
          <h2 className="section-title">🔐 Supervisor Details</h2>

          <div className="mb-4">
            <label className="form-label">Booking Phone Number</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={agentPhone}
                onChange={(e) => { setAgentPhone(e.target.value); setAgentName(''); }}
                onBlur={lookupAgent}
                className="form-input"
                placeholder="Enter 10-digit phone"
                maxLength={10}
              />
              {agentLookingUp && <div className="py-3 px-3 text-gray-400 text-sm">...</div>}
            </div>
          </div>

          {agentPhone.length >= 10 && (
            <div className="mb-4">
              <label className="form-label">Agent Name</label>
              {agentLookingUp ? (
                <div className="form-input bg-gray-50 text-gray-400 text-sm">Looking up...</div>
              ) : agentName ? (
                <div className="form-input bg-green-50 text-green-800 font-semibold">{agentName}</div>
              ) : (
                <div>
                  <div className="form-input bg-red-50 text-red-500 text-sm mb-3">No agent found for this number</div>
                  <p className="text-xs text-gray-400 mb-2">Want to save this number as an agent?</p>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="Enter agent name"
                    className="form-input mb-2"
                  />
                  <button
                    type="button"
                    onClick={saveNewAgent}
                    disabled={savingAgent || !newAgentName.trim()}
                    className="btn-primary w-full text-sm"
                  >
                    {savingAgent ? 'Saving...' : 'Save Agent'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="form-label">
              Booking ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value.toUpperCase())}
              className="form-input font-mono tracking-widest"
              placeholder="e.g. BK2026001"
              maxLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">Enter the Booking ID manually (required to approve)</p>
          </div>

          <div className="mb-4">
            <label className="form-label">Supervisor Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="form-input"
              rows={2}
              placeholder="Optional remarks..."
            />
          </div>

          <div className="mb-4">
            <label className="form-label">
              Inspection Result <span className="text-red-500">*</span>
            </label>
            <select
              value={inspectionResult}
              onChange={(e) => { setInspectionResult(e.target.value); setFailReason(''); }}
              className="form-input"
            >
              <option value="">-- Select Result --</option>
              <option value="Pass">✅ Pass</option>
              <option value="Fail">❌ Fail</option>
            </select>
          </div>

          {inspectionResult === 'Fail' && (
            <div className="mb-4">
              <label className="form-label">
                Fail Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="form-input border-red-300 focus:ring-red-400"
                rows={3}
                placeholder="Describe the reason for failure..."
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => {
              if (!bookingId.trim()) {
                setError('Booking ID is required to approve.');
                return;
              }
              handleAction('approve');
            }}
            disabled={submitting}
            className="btn-success"
          >
            {submitting ? 'Processing...' : '✅ Approve Inspection'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={submitting}
            className="w-full py-3 rounded-xl border-2 border-red-400 text-red-600 font-semibold text-base active:scale-95 transition-all disabled:opacity-50"
          >
            ❌ Reject / Fail Inspection
          </button>
          <button
            onClick={() => router.push('/supervisor')}
            className="btn-secondary"
          >
            ← Back to Queue
          </button>
        </div>
      </AppLayout>
    </>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

export default withAuth(SupervisorReview, [ROLES.SUPERVISOR, ROLES.ADMIN]);
