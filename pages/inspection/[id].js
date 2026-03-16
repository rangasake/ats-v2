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

function safeParseJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function InspectionDetail() {
  const router = useRouter();
  const { id, submitted } = router.query;
  const { user } = useAuth();
  const [inspection, setInspection] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  const handlePrint = useReactToPrint({ content: () => printRef.current });

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
          <Section title="🚗 Vehicle Information">
            <InfoRow label="Engine No." value={vehicle.engine_number} />
            <InfoRow label="Chassis No." value={vehicle.chassis_number} />
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
          <InfoRow label="Last RC / Expiry" value={`${inspection.last_rc || '-'} / ${inspection.last_rc_expiry || '-'}`} />
          <InfoRow label="PUC / Expiry" value={`${inspection.puc || '-'} / ${inspection.puc_expiry || '-'}`} />
          <InfoRow label="Insurance" value={`${inspection.insurance || '-'} / ${inspection.insurance_expiry || '-'}`} />
          <InfoRow label="Insurance Co." value={inspection.insurance_company} />
          {inspection.speed_governor && <InfoRow label="Speed Governor" value={inspection.speed_governor} />}
          {inspection.vlt_device && <InfoRow label="VLT Device" value={inspection.vlt_device} />}
        </Section>

        {/* Visual Checklist */}
        {Object.keys(visualData).length > 0 && (
          <Section title="🔍 Visual Test">
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
        {inspection.booking_id && (
          <Section title="✅ Supervisor Review">
            <InfoRow label="Status" value={inspection.status} />
            <InfoRow label="Agent Phone" value={inspection.agent_phone} />
            <InfoRow label="Agent Name" value={inspection.agent_name} />
            <InfoRow label="Booking ID" value={inspection.booking_id} />
            <InfoRow label="Remarks" value={inspection.supervisor_remarks} />
          </Section>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mt-4 no-print">
          {/* Continue if draft */}
          {inspection.status === INSPECTION_STATUS.DRAFT && (user?.role === ROLES.INSPECTOR || user?.role === ROLES.ADMIN) && (
            <button
              onClick={() => router.push(`/inspection/new?resume=${id}`)}
              className="btn-primary"
            >
              ✏️ Continue Inspection
            </button>
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

function Section({ title, children }) {
  return (
    <div className="card mb-4">
      <h2 className="section-title">{title}</h2>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  if (!value) return null;
  const isYes = value === 'Yes';
  const isNo = value === 'No';
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <span className={`text-sm font-semibold text-right
        ${highlight && isYes ? 'text-green-600' : ''}
        ${highlight && isNo ? 'text-red-500' : ''}
        ${!highlight ? 'text-gray-800' : ''}
      `}>
        {value}
      </span>
    </div>
  );
}

export default withAuth(InspectionDetail);
