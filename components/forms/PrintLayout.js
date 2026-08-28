import { forwardRef } from 'react';
import { VISUAL_CHECKLIST_ITEMS, DOC_CHECKLIST_ITEMS } from '../../lib/constants';
import { useSelector } from 'react-redux';
function safeParseJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Formats the display certificate ID as ATSK-DDMMYYYY-NNN (fallback if cert_id not stored yet) */
function formatCertId(certId, testDate) {
  const d = testDate ? new Date(testDate) : new Date();
  const dateStr = isNaN(d.getTime())
    ? `${String(new Date().getDate()).padStart(2,'0')}${String(new Date().getMonth()+1).padStart(2,'0')}${new Date().getFullYear()}`
    : `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;

  if (!certId) return `ATSK-${dateStr}-???`;

  // Already fully formatted
  if (certId.startsWith('ATSK-')) return certId;

  // Just a serial number stored (e.g. "007" or "7") — prefix with date
  const serial = String(parseInt(certId, 10) || certId).padStart(3, '0');
  return `ATSK-${dateStr}-${serial}`;
}

// Telugu disclaimer points
const DISCLAIMER_TELUGU = [
  'ఈ ఫిట్‌నెస్ సర్టిఫికేట్ పై పేర్కొన్న తేదీన పరీక్షించిన వాహనానికి మాత్రమే వర్తిస్తుంది.',
  'వాహన యజమాని వాహనాన్ని ఎల్లప్పుడూ రోడ్డుకు అనుకూలంగా నిర్వహించే బాధ్యత కలిగి ఉంటారు.',
  'ఈ సర్టిఫికేట్ మోటారు వాహనాల చట్టం కింద ఇతర చట్టబద్ధమైన అవసరాల నుండి మినహాయింపు ఇవ్వదు.',
  'వాహన వివరాలను తప్పుగా సమర్పించడం లేదా ఈ సర్టిఫికేట్‌తో తారుమారు చేయడం శిక్షార్హమైన నేరం.',
  'ఈ సర్టిఫికేట్ జారీ చేసిన తర్వాత సంభవించే ప్రమాదాలకు AFTS ఎటువంటి బాధ్యత వహించదు.',
];

const S = {
  // Page
  page: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '9.5px',
    color: '#1a1a2e',
    background: '#fff',
    width: '210mm',
    margin: '0 auto',
    padding: '8mm 10mm',
    boxSizing: 'border-box',
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '3px solid #0e7490',
    paddingBottom: '7px',
    marginBottom: '8px',
    background: 'linear-gradient(135deg,#f0f9ff,#ecfdf5)',
    borderRadius: '6px',
    padding: '8px 10px 7px',
  },
  logoBox: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg,#0e7490,#059669)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(14,116,144,0.3)',
  },
  companyBlock: {
    textAlign: 'center',
    flex: 1,
  },
  companyName: {
    fontSize: '14px',
    fontWeight: '900',
    color: '#0e7490',
    letterSpacing: '0.8px',
    lineHeight: '1.2',
    textTransform: 'uppercase',
  },
  companySubName: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#059669',
    letterSpacing: '0.4px',
    marginTop: '1px',
  },
  companyAddr: {
    fontSize: '8px',
    color: '#4b5563',
    marginTop: '3px',
    lineHeight: '1.5',
  },
  certBadge: {
    background: 'linear-gradient(90deg,#0e7490,#059669)',
    color: '#fff',
    fontSize: '8px',
    fontWeight: '700',
    padding: '2px 10px',
    borderRadius: '3px',
    marginTop: '4px',
    display: 'inline-block',
    letterSpacing: '0.8px',
  },

  // ── Certificate ID bar ───────────────────────────────────────
  idBar: {
    background: 'linear-gradient(90deg,#e0f2fe,#d1fae5)',
    border: '1px solid #7dd3fc',
    borderRadius: '5px',
    padding: '5px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '8.5px',
    flexWrap: 'wrap',
    gap: '4px',
  },
  idItem: { color: '#374151' },
  idVal:  { fontWeight: '800', color: '#0e7490', marginLeft: '4px' },
  idBox: {
    display: 'inline-block',
    minWidth: '60px',
    borderBottom: '1.5px solid #0e7490',
    marginLeft: '4px',
  },

  // ── Section header ───────────────────────────────────────────
  secHeader: {
    background: 'linear-gradient(90deg,#0e7490,#0284c7)',
    color: '#fff',
    fontSize: '8.5px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '3px',
    marginBottom: '5px',
    marginTop: '7px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },

  // ── Tables ───────────────────────────────────────────────────
  table: { width: '100%', borderCollapse: 'collapse' },
  tdLabel: {
    padding: '2.5px 6px',
    fontWeight: '600',
    width: '42%',
    background: '#f8fafc',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    fontSize: '8.5px',
  },
  tdValue: {
    padding: '2.5px 6px',
    color: '#111827',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '8.5px',
  },
  tdLabelSm: {
    padding: '2px 5px',
    fontWeight: '600',
    width: '55%',
    background: '#f8fafc',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    fontSize: '8px',
  },
  tdValueSm: {
    padding: '2px 5px',
    color: '#111827',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '8px',
    textAlign: 'center',
    fontWeight: '700',
  },

  // ── Two-column layout ────────────────────────────────────────
  twoCol: { display: 'flex', gap: '8px', marginBottom: '4px' },
  col:    { flex: 1, minWidth: 0 },

  // ── Tear line ────────────────────────────────────────────────
  tearLine: {
    margin: '10px 0 6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tearDash: {
    flex: 1,
    borderTop: '1.5px dashed #9ca3af',
  },
  tearText: {
    fontSize: '8px',
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },

  // ── Disclaimer ───────────────────────────────────────────────
  disclaimerBox: {
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '6px 10px',
    marginBottom: '6px',
    background: '#fafafa',
  },
  disclaimerTitle: {
    fontSize: '8.5px',
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  disclaimerItem: {
    fontSize: '9px',
    color: '#374151',
    lineHeight: '1.6',
    marginBottom: '1px',
    display: 'flex',
    gap: '4px',
  },

  // ── Feedback ─────────────────────────────────────────────────
  feedbackRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    background: '#f0f4ff',
    border: '1px solid #c7d2fe',
    borderRadius: '4px',
    padding: '5px 10px',
  },
  feedbackLabel: { fontSize: '8.5px', fontWeight: '700', color: '#1e3a8a', marginRight: '4px' },
  feedbackOpt: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '8.5px',
    color: '#374151',
    fontWeight: '600',
    marginRight: '8px',
  },
  checkbox: {
    width: '11px',
    height: '11px',
    border: '1.5px solid #374151',
    borderRadius: '2px',
    display: 'inline-block',
    flexShrink: 0,
  },
  checkboxFilled: {
    width: '11px',
    height: '11px',
    border: '1.5px solid #16a34a',
    borderRadius: '2px',
    background: '#16a34a',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#fff',
    fontSize: '7px',
  },

  // ── Staff & Signatures ───────────────────────────────────────
  staffRow: { display: 'flex', gap: '10px', marginBottom: '4px' },
  staffCol: { flex: 1 },
  sigBlock: {
    flex: 1,
    textAlign: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '4px 6px',
  },
  sigName:  { fontSize: '8.5px', fontWeight: '700', color: '#1e3a8a', marginBottom: '2px' },
  sigRole:  { fontSize: '7.5px', color: '#6b7280', marginBottom: '18px' },
  sigLine:  { borderTop: '1px solid #374151', marginTop: '4px', paddingTop: '2px', fontSize: '7px', color: '#9ca3af' },

  // ── Customer section ─────────────────────────────────────────
  customerRow: { display: 'flex', gap: '10px' },
  customerBlock: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '5px 8px',
    textAlign: 'center',
  },
  customerLabel: { fontSize: '8px', fontWeight: '700', color: '#374151', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  customerBox:   { height: '30px', border: '1px dashed #d1d5db', borderRadius: '3px', marginBottom: '3px', background: '#fafafa' },
  customerSub:   { fontSize: '7px', color: '#9ca3af' },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    textAlign: 'center',
    fontSize: '7.5px',
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '4px',
    marginTop: '6px',
  },
};

// ── Value badge ──────────────────────────────────────────────────────────────
function ValBadge({ val }) {
  if (!val) return <span style={{ color: '#9ca3af' }}>—</span>;
  const isYes = val === 'Yes';
  const isNo  = val === 'No';
  return (
    <span style={{
      fontSize: '7.5px',
      fontWeight: '700',
      padding: '1px 5px',
      borderRadius: '3px',
      background: isYes ? '#dcfce7' : isNo ? '#fee2e2' : 'transparent',
      color: isYes ? '#15803d' : isNo ? '#b91c1c' : '#111827',
    }}>
      {val}
    </span>
  );
}

const PrintLayout = forwardRef(function PrintLayout({ inspection, vehicle }, ref) {
  const org = useSelector((state) => state.org.org);
  if (!inspection || !vehicle || !org) return null;
  const visualData = safeParseJSON(inspection.visual_data, {});
  const feedback   = inspection.feedback || '';

  // Filter visible doc items
  const docRows = [
    { label: 'Test Date',         value: inspection.test_date },
    { label: 'Test Type',         value: inspection.test_type },
    { label: 'AFMS Receipt',      value: inspection.afms_free_receipt },
    { label: 'RC',                value: inspection.rc },
    { label: 'Last FC / Expiry',  value: `${inspection.last_rc || '—'} / ${inspection.last_rc_expiry || '—'}` },
    { label: 'PUC / Expiry',      value: `${inspection.puc || '—'} / ${inspection.puc_expiry || '—'}` },
    { label: 'Insurance / Exp',   value: `${inspection.insurance || '—'} / ${inspection.insurance_expiry || '—'}` },
    { label: 'Insurance Co.',     value: inspection.insurance_company },
    inspection.speed_governor && { label: 'Speed Governor', value: inspection.speed_governor },
    inspection.vlt_device     && { label: 'VLT Device',     value: inspection.vlt_device },
  ].filter(Boolean);

  const visRows = VISUAL_CHECKLIST_ITEMS.map((item) => ({
    label: item.label,
    value: visualData[item.id],
  })).filter((r) => r.value);

  return (
    <div ref={ref} style={S.page} className="print-page">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={S.header}>
        {/* Company Info — centered */}
        <div style={S.companyBlock}>
          <div style={S.companyName}>{org.cname}</div>
          <div style={S.companySubName}>(ATS {org.title})</div>
          <div style={S.companyAddr}>
           {org.adrs}
          </div>
          <span style={S.certBadge}>VEHICLE FITNESS INSPECTION CERTIFICATE</span>
        </div>
      </div>

      {/* ── ID BAR ─────────────────────────────────────────────── */}
      <div style={S.idBar}>
        <span style={S.idItem}>Cert ID: <strong style={S.idVal}>{formatCertId(inspection.cert_id, inspection.test_date)}</strong></span>
        <span style={S.idItem}>Booking ID:
          {inspection.booking_id
            ? <strong style={S.idVal}>{inspection.booking_id}</strong>
            : <span style={S.idBox}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>}
        </span>
        <span style={S.idItem}>Date: <strong style={S.idVal}>{inspection.test_date || new Date().toLocaleDateString('en-IN')}</strong></span>
        <span style={S.idItem}>Type: <strong style={S.idVal}>{inspection.test_type || '—'}</strong></span>
        <span style={S.idItem}>Status: <strong style={{ ...S.idVal, color: '#059669' }}>{inspection.status}</strong></span>
      </div>

      {/* ── ROW 1: COMMON DATA ─────────────────────────────────── */}
      <div style={S.secHeader}>① Vehicle &amp; Owner Information</div>
      <table style={{ ...S.table, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '32%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '32%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.tdLabel, width: '18%' }}>Vehicle Number</td>
            <td style={{ ...S.tdValue, width: '32%', fontWeight: '800', fontSize: '10px', color: '#0e7490' }}>{vehicle.vehicle_number}</td>
            <td style={{ ...S.tdLabel, width: '18%' }}>Engine Number</td>
            <td style={{ ...S.tdValue, width: '32%', overflowWrap: 'break-word' }}>{vehicle.engine_number}</td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: '18%' }}>Chassis Number</td>
            <td style={{ ...S.tdValue, width: '32%', overflowWrap: 'break-word' }}>{vehicle.chassis_number}</td>
            <td style={{ ...S.tdLabel, width: '18%' }}>Owner Name</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.owner_name}</td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: '18%' }}>Owner Phone</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.owner_phone}</td>
            <td style={{ ...S.tdLabel, width: '18%' }}>Reg. Date</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.registration_date}</td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: '18%' }}>Meter Reading</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.meter_reading ? `${vehicle.meter_reading} KM` : '—'}</td>
            <td style={{ ...S.tdLabel, width: '18%' }}>Mandal</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.mandal_name}</td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: '18%' }}>RTO Office</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.rto_office}</td>
            <td style={{ ...S.tdLabel, width: '18%' }}>Lane / Type</td>
            <td style={{ ...S.tdValue, width: '32%' }}>{vehicle.vehicle_lane} / {vehicle.lane_type}</td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: '18%' }}>Vehicle Location</td>
            <td style={{ ...S.tdValue, width: '82%', overflowWrap: 'break-word' }} colSpan={3}>{inspection.lat_long || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* ── ROW 2: DOC CHECKLIST (L) | VISUAL CHECKLIST (R) ────── */}
      <div style={S.twoCol}>
        {/* Left: Document Checklist */}
        <div style={S.col}>
          <div style={S.secHeader}>② Document Checklist</div>
          <table style={S.table}>
            <tbody>
              {docRows.map((r, i) => (
                <tr key={i}>
                  <td style={S.tdLabelSm}>{r.label}</td>
                  <td style={S.tdValueSm}><ValBadge val={r.value} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Visual Checklist */}
        <div style={S.col}>
          <div style={S.secHeader}>③ Visual Test Checklist</div>
          <table style={S.table}>
            <tbody>
              {visRows.length > 0 ? visRows.map((r, i) => (
                <tr key={i}>
                  <td style={S.tdLabelSm}>{r.label}</td>
                  <td style={S.tdValueSm}><ValBadge val={r.value} /></td>
                </tr>
              )) : (
                <tr><td colSpan={2} style={{ ...S.tdValueSm, color: '#9ca3af', textAlign: 'left', padding: '4px 6px' }}>No visual data recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ROW 3: STAFF + SUPERVISOR ──────────────────────────── */}
      <div style={S.secHeader}>④ Staff Information &amp; Verification</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        {[
          { role: 'Lane Inspector', name: inspection.lane_inspector },
          { role: 'Lane Incharge',  name: inspection.lane_incharge  },
          { role: 'Supervisor',     name: inspection.supervisor_username },
        ].map((s, i) => (
          <div key={i} style={S.sigBlock}>
            <div style={S.sigName}>{s.name || '—'}</div>
            <div style={S.sigRole}>{s.role}</div>
            <div style={S.sigLine}>Signature</div>
          </div>
        ))}
        {/* Remarks */}
        <div style={{ ...S.sigBlock, flex: 1.5 }}>
          <div style={{ ...S.sigRole, marginBottom: '2px', textAlign: 'left', fontWeight: '700', color: '#374151' }}>Remarks</div>
          <div style={{ fontSize: '8px', color: '#374151', minHeight: '28px', textAlign: 'left' }}>
            {inspection.remarks || '—'}
          </div>
        </div>
      </div>

      {/* ── TEAR LINE with info strip ────────────────────────────── */}
      <div style={{ margin: '8px 0 0' }}>
        {/* Dashed tear line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
          <div style={S.tearDash} />
          <span style={S.tearText}>✂ &nbsp; Tear Here &nbsp; ✂</span>
          <div style={S.tearDash} />
        </div>
        {/* Single info line below the dashes */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '8px', fontWeight: '700', color: '#374151',
          padding: '3px 6px', background: '#f1f5f9',
          borderRadius: '0 0 3px 3px', border: '1px solid #e2e8f0', borderTop: 'none',
        }}>
          <span style={{ color: '#1e3a8a' }}>
            Feedback:&nbsp;
            <span style={{
              padding: '1px 6px', borderRadius: '3px',
              background: feedback === 'Excellent' ? '#dcfce7' : feedback === 'Good' ? '#fef9c3' : feedback === 'Bad' ? '#fee2e2' : '#f3f4f6',
              color: feedback === 'Excellent' ? '#15803d' : feedback === 'Good' ? '#854d0e' : feedback === 'Bad' ? '#b91c1c' : '#6b7280',
            }}>
              {feedback || '—'}
            </span>
          </span>
          <span style={{ color: '#0e7490', fontSize: '9px', letterSpacing: '0.5px' }}>
            Vehicle No:&nbsp;<strong>{vehicle.vehicle_number}</strong>
          </span>
          <span style={{ color: '#374151' }}>
            Booking ID:&nbsp;<strong style={{ color: '#0e7490' }}>{inspection.booking_id || '—'}</strong>
          </span>
        </div>
      </div>

      {/* ── DISCLAIMER (Telugu) ───────────────────────────────────── */}
      <div style={S.disclaimerBox}>
        <div style={S.disclaimerTitle}>నిరాకరణ / Disclaimer</div>
        {DISCLAIMER_TELUGU.map((point, i) => (
          <div key={i} style={S.disclaimerItem}>
            <span style={{ fontWeight: '700', color: '#1e3a8a', flexShrink: 0 }}>{i + 1}.</span>
            <span>{point}</span>
          </div>
        ))}
      </div>

      {/* ── CUSTOMER INFO ─────────────────────────────────────────── */}
      <div style={S.customerRow}>
        <div style={{ ...S.customerBlock, flex: 2 }}>
          <div style={S.customerLabel}>Customer Name &amp; Signature</div>
          <div style={S.customerBox} />
          <div style={S.customerSub}>Name: ______________________________</div>
        </div>
        <div style={{ ...S.customerBlock, flex: 1 }}>
          <div style={S.customerLabel}>Thumb Impression</div>
          <div style={{ ...S.customerBox, height: '38px' }} />
          <div style={S.customerSub}>Left Thumb</div>
        </div>
        <div style={{ ...S.customerBlock, flex: 1 }}>
          <div style={S.customerLabel}>Office Seal</div>
          <div style={{ ...S.customerBox, height: '38px' }} />
          <div style={S.customerSub}>Authorised Seal</div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <div style={S.footer}>
        Generated: {new Date().toLocaleString('en-IN')} &nbsp;|&nbsp;
        {org.adrs} &nbsp;|&nbsp;
        This is a computer-generated certificate.
      </div>

    </div>
  );
});

export default PrintLayout;
