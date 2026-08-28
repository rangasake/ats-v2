import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useReactToPrint } from 'react-to-print';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import PrintLayout from '../../components/forms/PrintLayout';
import { withAuth } from '../../lib/useAuth';
import { useAuth } from '../../lib/useAuth';
import { ROLES, INSPECTION_STATUS, VISUAL_CHECKLIST_ITEMS, DOC_CHECKLIST_ITEMS } from '../../lib/constants';
import { useSelector } from 'react-redux';
function safeParseJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function InspectionDetail() {
  const router = useRouter();
  const { id, submitted, autoprint } = router.query;
  const { user } = useAuth();
  const [inspection, setInspection] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();
 const org = useSelector((state) => state.org.org);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // Auto-trigger print when ?autoprint=1 is present and data is loaded
  useEffect(() => {
    if (autoprint && inspection && vehicle && printRef.current) {
      const t = setTimeout(() => {
        handlePrint();
        // Clean up query param without reloading
        router.replace(`/inspection/${id}`, undefined, { shallow: true });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [autoprint, inspection, vehicle]);

  async function fetchData() {
    setLoading(true);
    try {
      const iRes = await fetch(`/api/inspection/get?id=${id}`);
      const iData = await iRes.json();
      if (iData.inspection) {
        setInspection(iData.inspection);
        // Fetch vehicle data
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

  const visualData = inspection ? safeParseJSON(inspection.visual_data, {}) : {};

  if (loading) {
    return (
      <AppLayout title="Inspection Detail">
        <div className="text-center py-16 text-gray-400">Loading...</div>
      </AppLayout>
    );
  }

  if (!inspection) {
    return (
      <AppLayout title="Not Found">
        <div className="text-center py-16 text-gray-400">Inspection not found</div>
      </AppLayout>
    );
  }

  return (
    <>
      <Head><title>Inspection {id} - AFTS</title></Head>
      <AppLayout title="Inspection Details">
        {/* Submitted Banner */}
        {submitted && (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-4 text-center">
            <div className="text-2xl mb-1">🎉</div>
            <div className="font-bold text-green-800">Submitted Successfully!</div>
            <div className="text-sm text-green-600">Pending supervisor review</div>
          </div>
        )}

        {/* Supervisor re-open notice — shown to inspector when inspection is reopened */}
        {inspection.status === INSPECTION_STATUS.DRAFT && inspection.supervisor_remarks && (
          <div className="bg-amber-50 border border-amber-400 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔄</span>
              <span className="font-bold text-amber-800">Re-opened by Supervisor</span>
            </div>
            <p className="text-sm text-amber-900 bg-amber-100 rounded-xl px-3 py-2">
              💬 <strong>Note:</strong> {inspection.supervisor_remarks}
            </p>
          </div>
        )}

        {/* Header Card */}
        <div className="card mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-gray-800">{inspection.vehicle_number}</div>
              <div className="text-xs text-gray-500 mt-0.5">ID: {inspection.inspection_id}</div>
              {inspection.booking_id && (
                <div className="text-xs text-blue-600 font-semibold mt-0.5">Booking: {inspection.booking_id}</div>
              )}
            </div>
            <StatusBadge status={inspection.status} />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3 text-xs text-gray-500">
            {inspection.lane_type && <span>🛣️ {inspection.lane_type}</span>}
            {inspection.test_date && <span>📅 {inspection.test_date}</span>}
            {inspection.test_type && <span>🔁 {inspection.test_type}</span>}
          </div>
        </div>

        {/* Vehicle Info */}
        {vehicle && (
          <Section
            title="🚗 Vehicle Information"
            action={user?.role === ROLES.SUPERVISOR || user?.role === ROLES.ADMIN ? (
              <button
                onClick={() => router.push(`/supervisor/review/${id}`)}
                className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                title="Edit vehicle details (Review Inspection)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            ) : null}
          >
            <InfoRow label="Engine No." value={vehicle.engine_number} />
            <InfoRow label="Chassis No." value={vehicle.chassis_number} />
            <InfoRow label="Meter Reading" value={vehicle.meter_reading ? `${vehicle.meter_reading} KM` : ''} />
            <InfoRow label="Owner" value={vehicle.owner_name} />
            <InfoRow label="Phone" value={vehicle.owner_phone} />
            <InfoRow label="Mandal / RTO" value={`${vehicle.mandal_name} / ${vehicle.rto_office}`} />
            <InfoRow label="Lane" value={`${vehicle.vehicle_lane} / ${vehicle.lane_type}`} />
            <InfoRow label="Reg. Date" value={vehicle.registration_date} />
          </Section>
        )}

        {/* Document Checklist */}
        <Section title="📄 Document Checklist">
          <InfoRow label="AFMS Receipt" value={inspection.afms_free_receipt} />
          <InfoRow label="RC" value={inspection.rc} />
          <InfoRow label="Last FC / Expiry" value={`${inspection.last_rc || '-'} / ${inspection.last_rc_expiry || '-'}`} />
          <InfoRow label="PUC / Expiry" value={`${inspection.puc || '-'} / ${inspection.puc_expiry || '-'}`} />
          <InfoRow label="Insurance" value={`${inspection.insurance || '-'} / ${inspection.insurance_expiry || '-'}`} />
          <InfoRow label="Insurance Co." value={inspection.insurance_company} />
          {inspection.speed_governor && <InfoRow label="Speed Governor" value={inspection.speed_governor} />}
          {inspection.vlt_device && <InfoRow label="VLT Device" value={inspection.vlt_device} />}
        </Section>

        {/* Visual Checklist */}
        {Object.keys(visualData).length > 0 && (
          <Section title="🔍 Visual Test">
            <InfoRow label="Vehicle Location" value={inspection.lat_long} />
            {VISUAL_CHECKLIST_ITEMS.map((item) => {
              const val = visualData[item.id];
              if (!val) return null;
              return <InfoRow key={item.id} label={item.label} value={val} highlight />;
            })}
          </Section>
        )}

        {/* Staff Info */}
        {inspection.lane_inspector && (
          <Section title="👨‍💼 Staff Information">
            <InfoRow label="Inspector" value={inspection.lane_inspector} />
            <InfoRow label="Incharge" value={inspection.lane_incharge} />
            <InfoRow label="Remarks" value={inspection.remarks} />
            <InfoRow label="Feedback" value={inspection.feedback} />
          </Section>
        )}

        {/* Supervisor Info */}
        {(inspection.booking_id || inspection.supervisor_remarks) && inspection.status !== INSPECTION_STATUS.DRAFT && (
          <Section title="✅ Supervisor Review">
            <InfoRow label="Status" value={inspection.status} />
            <InfoRow label="Booking Phone" value={inspection.agent_phone} />
            <InfoRow label="Booking Name" value={inspection.agent_name} />
            <InfoRow label="Booking ID" value={inspection.booking_id} />
            <InfoRow label="Remarks" value={inspection.supervisor_remarks} />
          </Section>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mt-4 no-print">

          {/* Continue if draft — any inspector can continue; non-owners are routed through the takeover popup in the resume flow */}
          {inspection.status === INSPECTION_STATUS.DRAFT && (user?.role === ROLES.INSPECTOR || user?.role === ROLES.ADMIN) && (
            <button
              onClick={() => router.push(`/inspection/new?resume=${id}`)}
              className="btn-primary"
            >
              ✏️ Continue Inspection
            </button>
          )}

          {/* Inspector: edit & resubmit rejected entry — only the original inspector (or admin), since takeover only applies to drafts */}
          {inspection.status === INSPECTION_STATUS.REJECTED && (inspection.inspector_username === user?.username || user?.role === ROLES.ADMIN) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">❌</span>
                <span className="font-bold text-red-800">Rejected by Supervisor</span>
              </div>
              {inspection.supervisor_remarks && (
                <p className="text-sm text-red-700 mb-3 bg-red-100 rounded-xl px-3 py-2">
                  💬 Reason: <strong>{inspection.supervisor_remarks}</strong>
                </p>
              )}
              <button
                onClick={() => router.push(`/inspection/new?resume=${id}`)}
                className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm active:scale-95 transition-all"
              >
                ✏️ Edit & Resubmit
              </button>
            </div>
          )}

          {/* Supervisor: reopen rejected entry back to Draft */}
          {inspection.status === INSPECTION_STATUS.REJECTED && (user?.role === ROLES.SUPERVISOR || user?.role === ROLES.ADMIN) && (
            <ReopenButton inspectionId={id} onDone={fetchData} />
          )}

          {/* Supervisor review button */}
          {inspection.status === INSPECTION_STATUS.PENDING && (user?.role === ROLES.SUPERVISOR || user?.role === ROLES.ADMIN) && (
            <button
              onClick={() => router.push(`/supervisor/review/${id}`)}
              className="btn-success"
            >
              📋 Review This Inspection
            </button>
          )}
  {/* Print */}
          {inspection.status === INSPECTION_STATUS.APPROVED && (
            <button onClick={handlePrint} className="btn-primary">
              🖨️ Print Certificate
            </button>
          )}

          <button onClick={() => router.push('/dashboard')} className="btn-secondary">
            ← Back to Dashboard
          </button>
        </div>

        {/* Hidden print layout */}
        <div style={{ display: 'none' }}>
          <PrintLayout ref={printRef} inspection={inspection} vehicle={vehicle} />
        </div>
      </AppLayout>
    </>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="card mb-4">
      <h2 className="section-title flex items-center justify-between gap-2">
        <span>{title}</span>
        {action}
      </h2>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  if (!value) return null;
  const isYes = value === 'Yes';
  const isNo  = value === 'No';
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <span className={`text-sm font-semibold text-right
        ${highlight && isYes ? 'text-green-600' : ''}
        ${highlight && isNo  ? 'text-red-500'   : ''}
        ${!highlight         ? 'text-gray-800'  : ''}
      `}>
        {value}
      </span>
    </div>
  );
}

// ── Supervisor reopen button with confirm + optional note ─────────────────────
function ReopenButton({ inspectionId, onDone }) {
  const [open, setOpen]         = useState(false);
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleReopen() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/supervisor/review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          inspection_id:      inspectionId,
          action:             'reopen',
          supervisor_remarks: note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reopen');
      setOpen(false);
      onDone && onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-orange-400 text-orange-700 bg-orange-50 rounded-xl font-bold text-sm active:scale-95 transition-all"
      >
        🔄 Re-open for Inspector Edit
      </button>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4">
      <p className="text-sm font-bold text-orange-800 mb-2">
        Re-open this inspection?
      </p>
      <p className="text-xs text-orange-700 mb-3">
        Status will change to <strong>Draft</strong>. Inspector can edit and resubmit.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for inspector (optional)..."
        className="w-full border border-orange-300 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
        rows={2}
      />
      {error && <p className="text-xs text-red-600 mb-2">⚠️ {error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setNote(''); setError(''); }}
          className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={handleReopen}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Confirm Re-open'}
        </button>
      </div>
    </div>
  );
}

export default withAuth(InspectionDetail);
