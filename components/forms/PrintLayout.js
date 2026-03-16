import { forwardRef } from 'react';
import { DISCLAIMER_POINTS, DOC_CHECKLIST_ITEMS, VISUAL_CHECKLIST_ITEMS } from '../../lib/constants';

function safeParseJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

const PrintLayout = forwardRef(function PrintLayout({ inspection, vehicle }, ref) {
  if (!inspection || !vehicle) return null;

  const visualData = safeParseJSON(inspection.visual_data, {});

  const docItems = DOC_CHECKLIST_ITEMS.filter((i) => i.type !== 'dropdown_search' && i.type !== 'date_only' && i.type !== 'dropdown');
  const visItems = VISUAL_CHECKLIST_ITEMS;

  return (
    <div ref={ref} className="print-only bg-white" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', fontSize: '11px', color: '#111' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '10px', marginBottom: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>
          AUTOMATED VEHICLE FITNESS TESTING STATION
        </div>
        <div style={{ fontSize: '12px', marginTop: '2px', color: '#555' }}>
          Vehicle Fitness Inspection Certificate
        </div>
        {inspection.booking_id && (
          <div style={{ fontSize: '11px', marginTop: '4px' }}>
            Booking ID: <strong>{inspection.booking_id}</strong> &nbsp;|&nbsp;
            Inspection ID: <strong>{inspection.inspection_id}</strong>
          </div>
        )}
      </div>

      {/* Common Data */}
      <SectionTitle>1. Vehicle Information</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <tbody>
          <PrintRow label="Vehicle Number" value={vehicle.vehicle_number} />
          <PrintRow label="Engine Number" value={vehicle.engine_number} />
          <PrintRow label="Chassis Number" value={vehicle.chassis_number} />
          <PrintRow label="Owner Name" value={vehicle.owner_name} />
          <PrintRow label="Owner Phone" value={vehicle.owner_phone} />
          <PrintRow label="Mandal / RTO" value={`${vehicle.mandal_name} / ${vehicle.rto_office}`} />
          <PrintRow label="Vehicle Lane" value={vehicle.vehicle_lane} />
          <PrintRow label="Lane Type" value={vehicle.lane_type} />
          <PrintRow label="Registration Date" value={vehicle.registration_date} />
        </tbody>
      </table>

      {/* Document Checklist */}
      <SectionTitle>2. Document Checklist</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <tbody>
          <PrintRow label="Test Date" value={inspection.test_date} />
          <PrintRow label="Test Type" value={inspection.test_type} />
          <PrintRow label="AFMS Free Receipt" value={inspection.afms_free_receipt} />
          <PrintRow label="RC" value={inspection.rc} />
          <PrintRow label="Last RC / Expiry" value={`${inspection.last_rc || '-'} / ${inspection.last_rc_expiry || '-'}`} />
          <PrintRow label="PUC / Expiry" value={`${inspection.puc || '-'} / ${inspection.puc_expiry || '-'}`} />
          <PrintRow label="Insurance / Expiry" value={`${inspection.insurance || '-'} / ${inspection.insurance_expiry || '-'}`} />
          <PrintRow label="Insurance Company" value={inspection.insurance_company} />
          {inspection.speed_governor && <PrintRow label="Speed Governor" value={inspection.speed_governor} />}
          {inspection.vlt_device && <PrintRow label="VLT Device" value={inspection.vlt_device} />}
        </tbody>
      </table>

      {/* Visual Checklist */}
      <SectionTitle>3. Visual Test Checklist</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <tbody>
          {VISUAL_CHECKLIST_ITEMS.map((item) => {
            const val = visualData[item.id];
            if (!val) return null;
            return <PrintRow key={item.id} label={item.label} value={val} />;
          })}
        </tbody>
      </table>

      {/* Staff Info */}
      <SectionTitle>4. Staff Information</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <tbody>
          <PrintRow label="Lane Inspector" value={inspection.lane_inspector} />
          <PrintRow label="Lane Incharge" value={inspection.lane_incharge} />
          <PrintRow label="Remarks" value={inspection.remarks} />
          <PrintRow label="Customer Feedback" value={inspection.feedback} />
        </tbody>
      </table>

      {/* Supervisor Section */}
      {inspection.booking_id && (
        <>
          <SectionTitle>5. Supervisor Review</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <tbody>
              <PrintRow label="Status" value={inspection.status} />
              <PrintRow label="Agent Phone" value={inspection.agent_phone} />
              <PrintRow label="Agent Name" value={inspection.agent_name} />
              <PrintRow label="Booking ID" value={inspection.booking_id} />
              <PrintRow label="Supervisor Remarks" value={inspection.supervisor_remarks} />
            </tbody>
          </table>
        </>
      )}

      {/* Disclaimer */}
      <SectionTitle>Disclaimer</SectionTitle>
      <ol style={{ paddingLeft: '16px', marginBottom: '16px', lineHeight: '1.6' }}>
        {DISCLAIMER_POINTS.map((p, i) => <li key={i} style={{ marginBottom: '4px' }}>{p}</li>)}
      </ol>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #ccc' }}>
        <SignBlock label="Lane Inspector Signature" name={inspection.lane_inspector} />
        <SignBlock label="Customer Signature & Thumb Print" />
        <SignBlock label="Lane Incharge Signature" name={inspection.lane_incharge} />
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '9px', color: '#888', borderTop: '1px solid #eee', paddingTop: '6px' }}>
        Generated on {new Date().toLocaleString('en-IN')} | AFTS Vehicle Fitness Testing Station
      </div>
    </div>
  );
});

export default PrintLayout;

function SectionTitle({ children }) {
  return (
    <div style={{ background: '#1e40af', color: 'white', padding: '4px 8px', fontWeight: 'bold', marginBottom: '6px', fontSize: '11px' }}>
      {children}
    </div>
  );
}

function PrintRow({ label, value }) {
  if (!value) return null;
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '4px 8px', fontWeight: '600', width: '45%', background: '#f9fafb', color: '#374151' }}>{label}</td>
      <td style={{ padding: '4px 8px', color: '#111827' }}>{value}</td>
    </tr>
  );
}

function SignBlock({ label, name }) {
  return (
    <div style={{ textAlign: 'center', width: '30%' }}>
      <div style={{ borderBottom: '1px solid #333', marginBottom: '4px', height: '40px' }} />
      <div style={{ fontSize: '10px', fontWeight: '600' }}>{label}</div>
      {name && <div style={{ fontSize: '9px', color: '#555' }}>{name}</div>}
    </div>
  );
}
