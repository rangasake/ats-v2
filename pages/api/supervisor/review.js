import { requireAuth } from "../../../lib/auth";
import {
  findRow,
  getRows,
  updateRow,
  appendRow,
  ensureHeaders,
  logAudit,
} from "../../../lib/googleSheets";
import { SHEETS, INSPECTION_STATUS, ADMIN_ROLES } from "../../../lib/constants";
import { VEHICLE_HEADERS } from "../../../lib/vehicleFields";
import { getOrgByHost } from "../../../lib/orgs";

/**
 * Generate ATSK-DDMMYYYY-NNN
 * Incrementing from the highest existing serial for that date.
 */
async function generateCertId(spreadsheetId, testDate) {
  const d = testDate ? new Date(testDate) : new Date();

  const dateStr =
    `${String(d.getDate()).padStart(2, "0")}` +
    `${String(d.getMonth() + 1).padStart(2, "0")}` +
    `${d.getFullYear()}`;

  const prefix = `ATSK-${dateStr}-`;

  const all = await getRows(spreadsheetId, SHEETS.INSPECTIONS);

  const serials = all
    .map((r) => r.cert_id)
    .filter(Boolean)
    .map((cid) => {
      if (cid.startsWith(prefix)) {
        return parseInt(cid.slice(prefix.length), 10);
      }

      return NaN;
    })
    .filter((n) => !isNaN(n));

  const next = serials.length > 0 ? Math.max(...serials) + 1 : 1;

  return `${prefix}${String(next).padStart(3, "0")}`;
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // --------------------------------------------------
    // Resolve organization from hostname
    // --------------------------------------------------

    const host = req.headers.host;
    const org = getOrgByHost(host);

    console.log("[REVIEW] host:", host);
    console.log("[REVIEW] org:", org?.id);
    console.log("[REVIEW] sheetId:", org?.sheetId);

    if (!org) {
      return res.status(400).json({
        error: "Organization not found",
      });
    }

    if (!org.sheetId) {
      return res.status(500).json({
        error: "Organization sheetId is not configured",
      });
    }

    // --------------------------------------------------
    // Request data
    // --------------------------------------------------

    const {
      inspection_id,
      action,
      agent_phone,
      agent_name,
      booking_id,
      supervisor_remarks,
      inspection_result,
      fail_reason,
      test_date,
      test_type,
      afms_free_receipt,
      rc,
      last_rc,
      last_rc_expiry,
      puc,
      puc_expiry,
      insurance,
      insurance_expiry,
      insurance_company,
      speed_governor,
      vlt_device,
    } = req.body;

    if (!inspection_id || !action) {
      return res.status(400).json({
        error: "inspection_id and action required",
      });
    }

    // --------------------------------------------------
    // Find inspection
    // --------------------------------------------------

    const inspection = await findRow(
      org.sheetId,
      SHEETS.INSPECTIONS,
      "inspection_id",
      inspection_id,
    );

    if (!inspection) {
      return res.status(404).json({
        error: "Not found",
      });
    }

    const now = new Date().toISOString();

    // --------------------------------------------------
    // REOPEN
    // --------------------------------------------------

    if (action === "reopen") {
      if (inspection.status !== INSPECTION_STATUS.REJECTED) {
        return res.status(400).json({
          error: "Only rejected inspections can be reopened",
        });
      }

      await updateRow(
        org.sheetId,
        SHEETS.INSPECTIONS,
        "inspection_id",
        inspection_id,
        {
          status: INSPECTION_STATUS.DRAFT,
          supervisor_remarks: supervisor_remarks || "",
          booking_id: "",
          updated_at: now,
        },
      );

      logAudit(
        org.sheetId,
        req.user.username,
        "REOPEN",
        inspection_id,
        inspection.vehicle_number || "",
      ).catch((err) => {
        console.error("[REVIEW] Reopen audit failed:", err);
      });

      return res.status(200).json({
        success: true,
        status: INSPECTION_STATUS.DRAFT,
      });
    }

    // --------------------------------------------------
    // APPROVE / REJECT
    // --------------------------------------------------

    if (inspection.status !== INSPECTION_STATUS.PENDING) {
      return res.status(400).json({
        error: "Inspection is not pending review",
      });
    }

    const newStatus =
      action === "approve"
        ? INSPECTION_STATUS.APPROVED
        : INSPECTION_STATUS.REJECTED;

    // --------------------------------------------------
    // Booking ID required for approval
    // --------------------------------------------------

    if (action === "approve" && !booking_id?.trim()) {
      return res.status(400).json({
        error: "Booking ID is required to approve",
      });
    }

    const finalBookingId = booking_id ? booking_id.trim().toUpperCase() : "";

    // --------------------------------------------------
    // Handle agent
    // --------------------------------------------------

    if (agent_phone) {
      const existingAgent = await findRow(
        org.sheetId,
        SHEETS.AGENTS,
        "phone",
        agent_phone,
      );

      if (!existingAgent) {
        await appendRow(org.sheetId, SHEETS.AGENTS, {
          phone: agent_phone,
          name: agent_name || "",
        });
      } else if (agent_name && !existingAgent.name) {
        await updateRow(org.sheetId, SHEETS.AGENTS, "phone", agent_phone, {
          name: agent_name,
        });
      }
    }

    // --------------------------------------------------
    // Ensure inspection headers
    // --------------------------------------------------

    await ensureHeaders(org.sheetId, SHEETS.INSPECTIONS, [
      "agent_phone",
      "agent_name",
      "cert_id",
      "inspection_result",
      "fail_reason",
      "b_num",
      "b_nam",
      "ins_result",
      "fc_expiry",
    ]);

    // --------------------------------------------------
    // Generate certificate only on approval
    // --------------------------------------------------

    let certId = "";

    if (action === "approve") {
      certId = await generateCertId(
        org.sheetId,
        test_date || inspection.test_date,
      );
    }

    // --------------------------------------------------
    // Update inspection
    // --------------------------------------------------

    const updated = await updateRow(
      org.sheetId,
      SHEETS.INSPECTIONS,
      "inspection_id",
      inspection_id,
      {
        status: newStatus,

        supervisor_username: req.user.username,

        agent_phone: agent_phone || "",

        agent_name: agent_name || "",

        booking_id: finalBookingId,

        b_num: agent_phone || inspection.agent_phone || "",

        b_nam: agent_name || inspection.b_nam || inspection.agent_name || "",

        ins_result: inspection_result || inspection.ins_result || "",

        supervisor_remarks: supervisor_remarks || "",

        inspection_result: inspection_result || "",

        fail_reason: inspection_result === "Fail" ? fail_reason || "" : "",

        test_date:         test_date         || inspection.test_date         || "",
        test_type:         test_type         || inspection.test_type         || "",
        afms_free_receipt: afms_free_receipt || inspection.afms_free_receipt || "",
        rc:                rc                || inspection.rc                || "",
        last_rc:           last_rc           || inspection.last_rc           || "",
        last_rc_expiry:    last_rc_expiry    || inspection.last_rc_expiry    || "",
        puc:               puc               || inspection.puc               || "",
        puc_expiry:        puc_expiry        || inspection.puc_expiry        || "",
        insurance:         insurance         || inspection.insurance         || "",
        insurance_expiry:  insurance_expiry  || inspection.insurance_expiry  || "",
        insurance_company: insurance_company || inspection.insurance_company || "",
        speed_governor:    speed_governor    || inspection.speed_governor    || "",
        vlt_device:        vlt_device        || inspection.vlt_device        || "",

        ...(certId ? { cert_id: certId } : {}),

        updated_at: now,
      },
    );

    if (!updated) {
      return res.status(500).json({
        error: "Failed to update inspection",
      });
    }

    // --------------------------------------------------
    // Sync booking + result to the Vehicles tab as well, so the
    // Vehicles tab is updated even if the browser's fire-and-forget
    // vehicle save silently fails.
    // --------------------------------------------------

    try {
      const vn = (inspection.vehicle_number || "").trim().toUpperCase();
      if (vn) {
        await ensureHeaders(org.sheetId, SHEETS.VEHICLES, VEHICLE_HEADERS);

        const vehicleRow = {
          b_num:      agent_phone || inspection.agent_phone || "",
          b_nam:      agent_name || inspection.b_nam || inspection.agent_name || "",
          ins_result: inspection_result || inspection.ins_result || "",
          fc_expiry:  inspection.fc_expiry || "",
        };

        const vehicleExists = await findRow(
          org.sheetId,
          SHEETS.VEHICLES,
          "vehicle_number",
          vn,
        );

        if (vehicleExists) {
          await updateRow(
            org.sheetId,
            SHEETS.VEHICLES,
            "vehicle_number",
            vn,
            {
              ...vehicleRow,
              updated_at: now,
            },
          );
        } else {
          await appendRow(org.sheetId, SHEETS.VEHICLES, {
            vehicle_number: vn,
            vehicle_lane:   inspection.vehicle_lane || "",
            lane_type:      inspection.lane_type    || "",
            ...vehicleRow,
            created_at: now,
            updated_at: now,
          });
        }
      }
    } catch (vehErr) {
      console.error("[REVIEW] Vehicles tab sync failed:", vehErr?.message);
    }

    // --------------------------------------------------
    // Audit
    // --------------------------------------------------

    const auditAction = action === "approve" ? "APPROVE" : "REJECT";

    logAudit(
      org.sheetId,
      req.user.username,
      auditAction,
      inspection_id,
      inspection.vehicle_number || "",
      inspection_result === "Fail"
        ? `Fail: ${fail_reason || ""}`
        : inspection_result || "",
    ).catch((err) => {
      console.error("[REVIEW] Audit log failed:", err);
    });

    return res.status(200).json({
      success: true,
      status: newStatus,
      booking_id: finalBookingId,
      ...(certId ? { cert_id: certId } : {}),
    });
  } catch (err) {
    console.error("[REVIEW] Error:", err);
    console.error("[REVIEW] Stack:", err?.stack);

    return res.status(500).json({
      error: "Server error",
      details: err?.message || "Unknown error",
    });
  }
}

export default requireAuth(handler, ["Supervisor", ...ADMIN_ROLES]);
