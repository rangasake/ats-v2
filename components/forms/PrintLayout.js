import { forwardRef } from "react";
import {
  VISUAL_CHECKLIST_ITEMS,
  DOC_CHECKLIST_ITEMS,
} from "../../lib/constants";
import { useSelector } from "react-redux";
function safeParseJSON(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/** Formats the display certificate ID as ATSK-DDMMYYYY-NNN (fallback if cert_id not stored yet) */
function formatCertId(certId, testDate) {
  const d = testDate ? new Date(testDate) : new Date();
  const dateStr = isNaN(d.getTime())
    ? `${String(new Date().getDate()).padStart(2, "0")}${String(new Date().getMonth() + 1).padStart(2, "0")}${new Date().getFullYear()}`
    : `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${d.getFullYear()}`;

  if (!certId) return `ATSK-${dateStr}-???`;

  // Already fully formatted
  if (certId.startsWith("ATSK-")) return certId;

  // Just a serial number stored (e.g. "007" or "7") — prefix with date
  const serial = String(parseInt(certId, 10) || certId).padStart(3, "0");
  return `ATSK-${dateStr}-${serial}`;
}

// Telugu disclaimer points
const DISCLAIMER_TELUGU = [
  "ఫిట్నెస్ పరీక్ష కోసం వాహనం తప్పనిసరి అన్లోడ్ చేయాలి",
  "ఫిట్నెస్ పరీక్ష సమయంలో డ్రైవర్ మరియు యజమానిని పరీక్షా స్థలానికి అనుమతించలేదు.",
  "ఫిట్నెస్ పరీక్ష సమయంలో అన్ని గాడ్జెట్లు, అటాచ్మెంట్లు, ముఖ్యమైన వస్తువులు వాహనంలో ఉండకూడదు",
  "ఫిట్నెస్ పరీక్ష సమయంలో, వాహనానికి ఏదైనా నష్టం జరిగితే ATS సెంటర్ బాధ్యత వహించదు.",
  "అన్నిక్లెయిమ్లు ఆంధ్రప్రదేశ్ కోర్టులో మాత్రమే పరిష్కరించబడతాయి",
];

const S = {
  // Page
  page: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "9.5px",
    color: "#1a1a2e",
    background: "#fff",
    width: "210mm",
    margin: "0 auto",
    padding: "8mm 10mm",
    boxSizing: "border-box",
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: "0px solid #dbe4f0",
    paddingBottom: "10px",
    marginBottom: "10px",
    background: "#fff",
    padding: "8px 10px 10px",
  },
  logoBox: {
    width: "56px",
    height: "56px",
    background: "linear-gradient(150deg,#e8edf7,#d5deee)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
    flexShrink: 0,
    boxShadow: "0 1px 3px rgba(30,58,138,0.12)",
  },
  companyBlock: {
    textAlign: "center",
    flex: 1,
  },
  companyName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#22304a",
    letterSpacing: "0.6px",
    lineHeight: "1.2",
    textTransform: "uppercase",
  },
  companySubName: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#5b6b8c",
    letterSpacing: "0.4px",
    marginTop: "1px",
  },
  companyAddr: {
    fontSize: "8px",
    color: "#6b7280",
    marginTop: "3px",
    lineHeight: "1.5",
  },
  certBadge: {
    background: "#f7f9fc",
    color: "#fff",
    fontSize: "8px",
    fontWeight: "700",
    padding: "3px 14px",
    borderRadius: "2px",
    marginTop: "5px",
    display: "inline-block",
    letterSpacing: "1.2px",
  },

  // ── Certificate ID bar ───────────────────────────────────────
  idBar: {
    background: "#f7f9fc",
    border: "1px solid #e3e9f2",
    borderRadius: "4px",
    padding: "6px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    fontSize: "8.5px",
    flexWrap: "wrap",
    gap: "4px",
  },
  idItem: { color: "#475569" },
  idVal: { fontWeight: "800", color: "#1e3a8a", marginLeft: "4px" },
  idBox: {
    display: "inline-block",
    minWidth: "60px",
    borderBottom: "1.5px solid #93a5c4",
    marginLeft: "4px",
  },

  // ── Section header ───────────────────────────────────────────
  secHeader: {
    background: "transparent",
    color: "#1e3a8a",
    borderBottom: "2px solid #1e3a8a",
    fontSize: "8.5px",
    fontWeight: "700",
    padding: "2px 0 3px",
    marginBottom: "6px",
    marginTop: "9px",
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },

  // ── Tables ───────────────────────────────────────────────────
  table: { width: "100%", borderCollapse: "collapse" },
  tdLabel: {
    padding: "2.5px 6px",
    fontWeight: "600",
    width: "42%",
    background: "#f8fafc",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #e5e7eb",
    fontSize: "8.5px",
  },
  tdValue: {
    padding: "2.5px 6px",
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "8.5px",
  },
  tdLabelSm: {
    padding: "2px 5px",
    fontWeight: "600",
    width: "55%",
    background: "#f8fafc",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #e5e7eb",
    fontSize: "8px",
  },
  tdValueSm: {
    padding: "2px 5px",
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "8px",
    textAlign: "center",
    fontWeight: "700",
  },

  // ── Two-column layout ────────────────────────────────────────
  twoCol: { display: "flex", gap: "8px", marginBottom: "4px" },
  col: { flex: 1, minWidth: 0 },

  // ── Tear line ────────────────────────────────────────────────
  tearLine: {
    margin: "10px 0 6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  tearDash: {
    flex: 1,
    borderTop: "1.5px dashed #9ca3af",
  },
  tearText: {
    fontSize: "8px",
    color: "#9ca3af",
    fontWeight: "600",
    letterSpacing: "1px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },

  // ── Disclaimer ───────────────────────────────────────────────
  disclaimerBox: {
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    padding: "6px 10px",
    marginBottom: "6px",
    background: "#fafafa",
  },
  disclaimerTitle: {
    fontSize: "8.5px",
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  disclaimerItem: {
    fontSize: "9px",
    color: "#374151",
    lineHeight: "1.6",
    marginBottom: "1px",
    display: "flex",
    gap: "4px",
  },

  // ── Feedback ─────────────────────────────────────────────────
  feedbackRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: "4px",
    padding: "5px 10px",
  },
  feedbackLabel: {
    fontSize: "8.5px",
    fontWeight: "700",
    color: "#1e3a8a",
    marginRight: "4px",
  },
  feedbackOpt: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "8.5px",
    color: "#374151",
    fontWeight: "600",
    marginRight: "8px",
  },
  checkbox: {
    width: "11px",
    height: "11px",
    border: "1.5px solid #374151",
    borderRadius: "2px",
    display: "inline-block",
    flexShrink: 0,
  },
  checkboxFilled: {
    width: "11px",
    height: "11px",
    border: "1.5px solid #3b4f78",
    borderRadius: "2px",
    background: "#3b4f78",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#fff",
    fontSize: "7px",
  },

  // ── Staff & Signatures ───────────────────────────────────────
  staffRow: { display: "flex", gap: "10px", marginBottom: "4px" },
  staffCol: { flex: 1 },
  sigBlock: {
    flex: 1,
    textAlign: "center",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    padding: "4px 6px",
  },
  sigName: {
    fontSize: "8.5px",
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: "2px",
  },
  sigRole: { fontSize: "7.5px", color: "#6b7280", marginBottom: "18px" },
  sigLine: {
    borderTop: "1px solid #374151",
    marginTop: "4px",
    paddingTop: "2px",
    fontSize: "7px",
    color: "#9ca3af",
  },

  // ── Customer section ─────────────────────────────────────────
  customerRow: { display: "flex", gap: "10px" },
  customerBlock: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    padding: "5px 8px",
    textAlign: "center",
  },
  customerLabel: {
    fontSize: "8px",
    fontWeight: "700",
    color: "#374151",
    marginBottom: "3px",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  customerBox: {
    height: "30px",
    border: "1px dashed #d1d5db",
    borderRadius: "3px",
    marginBottom: "3px",
    background: "#fafafa",
  },
  customerSub: { fontSize: "7px", color: "#9ca3af" },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    textAlign: "center",
    fontSize: "7.5px",
    color: "#9ca3af",
    borderTop: "1px solid #e5e7eb",
    paddingTop: "4px",
    marginTop: "6px",
  },
};

// ── Value badge ──────────────────────────────────────────────────────────────
function ValBadge({ val }) {
  if (!val) return <span style={{ color: "#9ca3af" }}>—</span>;
  const isYes = val === "Yes";
  const isNo = val === "No";
  return (
    <span
      style={{
        fontSize: "7.5px",
        fontWeight: "700",
        padding: "1px 5px",
        borderRadius: "3px",
        background: isYes ? "#dcfce7" : isNo ? "#fee2e2" : "transparent",
        color: isYes ? "#15803d" : isNo ? "#b91c1c" : "#111827",
      }}
    >
      {val}
    </span>
  );
}

const PrintLayout = forwardRef(function PrintLayout(
  { inspection, vehicle },
  ref,
) {
  const org = useSelector((state) => state.org.org);
  if (!inspection || !vehicle || !org) return null;
  const visualData = safeParseJSON(inspection.visual_data, {});
  const feedback = inspection.feedback || "";

  // Filter visible doc items
  const docRows = [
    { label: "Test Date", value: inspection.test_date },
    { label: "Test Type", value: inspection.test_type },
    { label: "AFMS Receipt", value: inspection.afms_free_receipt },
    { label: "RC", value: inspection.rc },
    {
      label: "Last FC / Expiry",
      value: `${inspection.last_rc || "—"} / ${inspection.last_rc_expiry || "—"}`,
    },
    {
      label: "PUC / Expiry",
      value: `${inspection.puc || "—"} / ${inspection.puc_expiry || "—"}`,
    },
    {
      label: "Insurance / Exp",
      value: `${inspection.insurance || "—"} / ${inspection.insurance_expiry || "—"}`,
    },
    { label: "Insurance Co.", value: inspection.insurance_company },
    inspection.speed_governor && {
      label: "Speed Governor",
      value: inspection.speed_governor,
    },
    inspection.vlt_device && {
      label: "VLT Device",
      value: inspection.vlt_device,
    },
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
          {/* <div style={S.companySubName}>(ATS {org.title})</div> */}
          <div style={S.companyAddr}>{org.adrs}</div>
          <span style={S.companyAddr}>
            VEHICLE FITNESS INSPECTION CERTIFICATE
          </span>
        </div>
      </div>

      {/* ── ID BAR ─────────────────────────────────────────────── */}
      <div style={S.idBar}>
        <span style={S.idItem}>
          Cert ID:{" "}
          <strong style={S.idVal}>
            {formatCertId(inspection.cert_id, inspection.test_date)}
          </strong>
        </span>
        <span style={S.idItem}>
          Booking ID:
          {inspection.booking_id ? (
            <strong style={S.idVal}>{inspection.booking_id}</strong>
          ) : (
            <span style={S.idBox}>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          )}
        </span>
        <span style={S.idItem}>
          Date:{" "}
          <strong style={S.idVal}>
            {inspection.test_date || new Date().toLocaleDateString("en-IN")}
          </strong>
        </span>
        <span style={S.idItem}>
          Type: <strong style={S.idVal}>{inspection.test_type || "—"}</strong>
        </span>
        <span style={S.idItem}>
          Status:{" "}
          <strong style={{ ...S.idVal, color: "#2563eb" }}>
            {inspection.status}
          </strong>
        </span>
      </div>

      {/* ── ROW 1: COMMON DATA ─────────────────────────────────── */}
      <div style={S.secHeader}>1. Vehicle &amp; Owner Information</div>
      <table style={{ ...S.table, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "32%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "32%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.tdLabel, width: "18%" }}>Vehicle Number</td>
            <td
              style={{
                ...S.tdValue,
                width: "32%",
                fontWeight: "800",
                fontSize: "10px",
                color: "#2563eb",
              }}
            >
              {vehicle.vehicle_number}
            </td>
            <td style={{ ...S.tdLabel, width: "18%" }}>Engine Number</td>
            <td
              style={{ ...S.tdValue, width: "32%", overflowWrap: "break-word" }}
            >
              {vehicle.engine_number}
            </td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: "18%" }}>Chassis Number</td>
            <td
              style={{ ...S.tdValue, width: "32%", overflowWrap: "break-word" }}
            >
              {vehicle.chassis_number}
            </td>
            <td style={{ ...S.tdLabel, width: "18%" }}>Owner Name</td>
            <td style={{ ...S.tdValue, width: "32%" }}>{vehicle.owner_name}</td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: "18%" }}>Owner Phone</td>
            <td style={{ ...S.tdValue, width: "32%" }}>
              {vehicle.owner_phone}
            </td>
            <td style={{ ...S.tdLabel, width: "18%" }}>Reg. Date</td>
            <td style={{ ...S.tdValue, width: "32%" }}>
              {vehicle.registration_date}
            </td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: "18%" }}>Meter Reading</td>
            <td style={{ ...S.tdValue, width: "32%" }}>
              {vehicle.meter_reading ? `${vehicle.meter_reading} KM` : "—"}
            </td>
            <td style={{ ...S.tdLabel, width: "18%" }}>Mandal</td>
            <td style={{ ...S.tdValue, width: "32%" }}>
              {vehicle.mandal_name}
            </td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: "18%" }}>RTO Office</td>
            <td style={{ ...S.tdValue, width: "32%" }}>{vehicle.rto_office}</td>
            <td style={{ ...S.tdLabel, width: "18%" }}>Lane / Type</td>
            <td style={{ ...S.tdValue, width: "32%" }}>
              {vehicle.vehicle_lane} / {vehicle.lane_type}
            </td>
          </tr>
          <tr>
            <td style={{ ...S.tdLabel, width: "18%" }}>Vehicle Location</td>
            <td
              style={{ ...S.tdValue, width: "82%", overflowWrap: "break-word" }}
              colSpan={3}
            >
              {inspection.lat_long || "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── ROW 2: DOC CHECKLIST (L) | VISUAL CHECKLIST (R) ────── */}
      <div style={S.twoCol}>
        {/* Left: Document Checklist */}
        <div style={S.col}>
          <div style={S.secHeader}>2. Document Checklist</div>
          <table style={S.table}>
            <tbody>
              {docRows.map((r, i) => (
                <tr key={i}>
                  <td style={S.tdLabelSm}>{r.label}</td>
                  <td style={S.tdValueSm}>
                    <ValBadge val={r.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Visual Checklist */}
        <div style={S.col}>
          <div style={S.secHeader}>3. Visual Test Checklist</div>
          <table style={S.table}>
            <tbody>
              {visRows.length > 0 ? (
                visRows.map((r, i) => (
                  <tr key={i}>
                    <td style={S.tdLabelSm}>{r.label}</td>
                    <td style={S.tdValueSm}>
                      <ValBadge val={r.value} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      ...S.tdValueSm,
                      color: "#9ca3af",
                      textAlign: "left",
                      padding: "4px 6px",
                    }}
                  >
                    No visual data recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ROW 3: STAFF + SUPERVISOR ──────────────────────────── */}
      <div style={S.secHeader}>4. Staff Information &amp; Verification</div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
        {[
          { role: "Lane Inspector", name: inspection.lane_inspector },
          { role: "Lane Incharge", name: inspection.lane_incharge },
          { role: "Supervisor", name: inspection.supervisor_username },
        ].map((s, i) => (
          <div key={i} style={S.sigBlock}>
            <div style={S.sigName}>{s.name || "—"}</div>
            <div style={S.sigRole}>{s.role}</div>
            <div style={S.sigLine}>Signature</div>
          </div>
        ))}
        {/* Remarks */}
        <div style={{ ...S.sigBlock, flex: 1.5 }}>
          <div
            style={{
              ...S.sigRole,
              marginBottom: "2px",
              textAlign: "left",
              fontWeight: "700",
              color: "#374151",
            }}
          >
            Remarks
          </div>
          <div
            style={{
              fontSize: "8px",
              color: "#374151",
              minHeight: "28px",
              textAlign: "left",
            }}
          >
            {inspection.remarks || "—"}
          </div>
        </div>
      </div>
      {/* Note and customer feedback sections */}
      <div style={S.secHeader}>5. Note and Feedback </div>
      <span>
        నేను అందుకున్న వాహనం ఎటువంటి డామేజ్ లేకుండా ఉంది | నేను ఫారమ్ 38 మరియు
        ఫారమ్ 69 అందుకున్నాను.
      </span> 
      <div className="flex gap-3 mt-2">
        {["బాగాలేదు", "బాగుంది", "చాలా బాగుంది"].map((opt) => {
          return (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                key={opt}
                onClick={() => set("feedback", opt)}
                className="h-3 w-3 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm">
                {opt}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── TEAR LINE with info strip ────────────────────────────── */}
      <div style={{ margin: "8px 0 0" }}>
        {/* Dashed tear line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 0",
          }}
        >
          <div style={S.tearDash} />
          <span style={S.tearText}>✂ &nbsp; Tear Here &nbsp; ✂</span>
          <div style={S.tearDash} />
        </div>
        {/* Single info line below the dashes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "8px",
            fontWeight: "700",
            color: "#374151",
            padding: "3px 6px",
            background: "#f1f5f9",
            borderRadius: "0 0 3px 3px",
            border: "1px solid #e2e8f0",
            borderTop: "none",
          }}
        >
          {/* <span style={{ color: '#1e3a8a' }}>
            Feedback:&nbsp;
            <span style={{
              padding: '1px 6px', borderRadius: '3px',
              background: feedback === 'Excellent' ? '#dcfce7' : feedback === 'Good' ? '#fef9c3' : feedback === 'Bad' ? '#fee2e2' : '#f3f4f6',
              color: feedback === 'Excellent' ? '#15803d' : feedback === 'Good' ? '#854d0e' : feedback === 'Bad' ? '#b91c1c' : '#6b7280',
            }}>
              {feedback || '—'}
            </span>
          </span> */}
          <span
            style={{
              color: "#1e3a8a",
              fontSize: "9px",
              letterSpacing: "0.5px",
            }}
          >
            Vehicle No:&nbsp;<strong>{vehicle.vehicle_number}</strong>
          </span>
          <span style={{ color: "#374151" }}>
            Booking ID:&nbsp;
            <strong style={{ color: "#1e3a8a" }}>
              {inspection.booking_id || "—"}
            </strong>
          </span>
        </div>
      </div>

      {/* ── DISCLAIMER (Telugu) ───────────────────────────────────── */}
      <div style={S.disclaimerBox}>
        <div style={S.disclaimerTitle}>నిరాకరణ / Disclaimer</div>
        {DISCLAIMER_TELUGU.map((point, i) => (
          <div key={i} style={S.disclaimerItem}>
            <span
              style={{ fontWeight: "700", color: "#1e3a8a", flexShrink: 0 }}
            >
              {i + 1}.
            </span>
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
          <div style={{ ...S.customerBox, height: "38px" }} />
          <div style={S.customerSub}>Left Thumb</div>
        </div>
        <div style={{ ...S.customerBlock, flex: 1 }}>
          <div style={S.customerLabel}>Office Seal</div>
          <div style={{ ...S.customerBox, height: "38px" }} />
          <div style={S.customerSub}>Authorised Seal</div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <div style={S.footer}>
        Generated: {new Date().toLocaleString("en-IN")} &nbsp;|&nbsp;
        {org.adrs} &nbsp;|&nbsp; This is a computer-generated certificate.
      </div>
    </div>
  );
});

export default PrintLayout;
