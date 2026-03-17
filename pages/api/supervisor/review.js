import { requireAuth } from '../../../lib/auth';
import { findRow, updateRow, appendRow } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';

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

    await updateRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
      status:              newStatus,
      supervisor_username: req.user.username,
      agent_phone:         agent_phone || '',
      agent_name:          agent_name  || '',
      booking_id:          finalBookingId,
      supervisor_remarks:  supervisor_remarks || '',
      updated_at:          now,
    });

    return res.status(200).json({ success: true, status: newStatus, booking_id: finalBookingId });
  } catch (err) {
    console.error('Review error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Supervisor', 'Admin']);