import { requireAuth } from '../../../lib/auth';
import { findRow, getRows, updateRow, appendRow, ensureHeaders } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';

/** Generate ATSK-DDMMYYYY-NNN, incrementing from the highest existing serial for that date */
async function generateCertId(testDate) {
  const d = testDate ? new Date(testDate) : new Date();
  const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
  const prefix = `ATSK-${dateStr}-`;
  const all = await getRows(SHEETS.INSPECTIONS);
  const serials = all
    .map((r) => r.cert_id)
    .filter(Boolean)
    .map((cid) => {
      // Handle fully formatted: ATSK-17052026-007
      if (cid.startsWith(prefix)) return parseInt(cid.slice(prefix.length), 10);
      // Handle bare serial stored for the same test_date (e.g. "007" or "7")
      // Only count if the row's test_date matches
      return NaN;
    })
    .filter((n) => !isNaN(n));
  const next = serials.length > 0 ? Math.max(...serials) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { inspection_id, action, agent_phone, agent_name, booking_id, supervisor_remarks } = req.body;
  if (!inspection_id || !action) return res.status(400).json({ error: 'inspection_id and action required' });

  try {
    const inspection = await findRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    const now = new Date().toISOString();

    // ── Supervisor: reopen a rejected entry back to Draft ────────────────────
    // Inspector can then edit and resubmit
    if (action === 'reopen') {
      if (inspection.status !== INSPECTION_STATUS.REJECTED) {
        return res.status(400).json({ error: 'Only rejected inspections can be reopened' });
      }
      await updateRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
        status:             INSPECTION_STATUS.DRAFT,
        supervisor_remarks: supervisor_remarks || '',
        booking_id:         '',   // clear old booking id
        updated_at:         now,
      });
      return res.status(200).json({ success: true, status: INSPECTION_STATUS.DRAFT });
    }

    // ── Normal approve / reject — must be Pending ────────────────────────────
    if (inspection.status !== INSPECTION_STATUS.PENDING) {
      return res.status(400).json({ error: 'Inspection is not pending review' });
    }

    const newStatus = action === 'approve' ? INSPECTION_STATUS.APPROVED : INSPECTION_STATUS.REJECTED;

    // Booking ID required for approval
    if (action === 'approve' && !booking_id?.trim()) {
      return res.status(400).json({ error: 'Booking ID is required to approve' });
    }

    const finalBookingId = booking_id ? booking_id.trim().toUpperCase() : '';

    // Handle agent
    if (agent_phone) {
      const existingAgent = await findRow(SHEETS.AGENTS, 'phone', agent_phone);
      if (!existingAgent) {
        await appendRow(SHEETS.AGENTS, { phone: agent_phone, name: agent_name || '' });
      } else if (agent_name && !existingAgent.name) {
        await updateRow(SHEETS.AGENTS, 'phone', agent_phone, { name: agent_name });
      }
    }

    await ensureHeaders(SHEETS.INSPECTIONS, ['agent_phone', 'agent_name', 'cert_id']);

    // Generate cert_id only on approval (not rejection)
    let certId = '';
    if (action === 'approve') {
      certId = await generateCertId(inspection.test_date);
    }

    await updateRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
      status:              newStatus,
      supervisor_username: req.user.username,
      agent_phone:         agent_phone || '',
      agent_name:          agent_name  || '',
      booking_id:          finalBookingId,
      supervisor_remarks:  supervisor_remarks || '',
      ...(certId ? { cert_id: certId } : {}),
      updated_at:          now,
    });

    return res.status(200).json({ success: true, status: newStatus, booking_id: finalBookingId, ...(certId ? { cert_id: certId } : {}) });
  } catch (err) {
    console.error('Review error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Supervisor', 'Admin']);