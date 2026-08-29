import { requireAuth } from "../../../lib/auth";
import { findRow, updateRow, logAudit } from "../../../lib/googleSheets";
import { SHEETS, INSPECTION_STATUS } from "../../../lib/constants";
import { getOrgByHost } from "../../../lib/orgs";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // --------------------------------------------------
    // Resolve organization from current domain
    // --------------------------------------------------

    const host = req.headers.host;
    const org = getOrgByHost(host);

    console.log("[SUBMIT] host:", host);
    console.log("[SUBMIT] org:", org?.id);
    console.log("[SUBMIT] sheetId:", org?.sheetId);

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

    const { inspection_id, ...finalData } = req.body;

    if (!inspection_id) {
      return res.status(400).json({
        error: "inspection_id required",
      });
    }

    // --------------------------------------------------
    // Required fields
    // --------------------------------------------------

    const REQUIRED_FIELDS = [
      {
        field: "lane_inspector",
        label: "Lane Inspector",
      },
      {
        field: "lane_incharge",
        label: "Lane Incharge",
      },
    ];

    // --------------------------------------------------
    // Find existing inspection
    // --------------------------------------------------

    const existing = await findRow(
      org.sheetId,
      SHEETS.INSPECTIONS,
      "inspection_id",
      inspection_id,
    );

    if (!existing) {
      return res.status(404).json({
        error: "Inspection not found",
      });
    }

    // --------------------------------------------------
    // Authorization
    // --------------------------------------------------

    if (
      existing.inspector_username !== req.user.username &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).json({
        error: "Not authorized",
      });
    }

    // --------------------------------------------------
    // Merge existing + submitted data
    // --------------------------------------------------

    const merged = {
      ...existing,
      ...finalData,
    };

    const missingFields = REQUIRED_FIELDS.filter(
      ({ field }) => !merged[field],
    ).map(({ label }) => label);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
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
        ...finalData,
        status: INSPECTION_STATUS.PENDING,
        step: "3",
        updated_at: new Date().toISOString(),
      },
    );

    if (!updated) {
      return res.status(500).json({
        error: "Failed to update inspection",
      });
    }

    // --------------------------------------------------
    // Audit
    // --------------------------------------------------

    logAudit(
      org.sheetId,
      req.user.username,
      "SUBMIT",
      inspection_id,
      existing.vehicle_number || "",
    ).catch((err) => {
      console.error("[SUBMIT] Audit log failed:", err);
    });

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error("[SUBMIT] Error:", err);
    console.error("[SUBMIT] Stack:", err?.stack);

    return res.status(500).json({
      error: "Server error",
      details: err?.message || "Unknown error",
    });
  }
}

export default requireAuth(handler, ["Inspector", "Admin"]);
