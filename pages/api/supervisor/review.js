import { requireAuth } from '../../../lib/auth';
import { findRow, getRows, updateRow, appendRow, ensureHeaders, logAudit } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';
import { getCertPrefix } from '../../../lib/orgs';

/** Generate <PREFIX>-DDMMYYYY-NNN, incrementing from the highest existing serial for that date */
async function generateCertId(orgId, testDate) {
  const d = testDate ? new Date(testDate) : new Date();
  const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
  const prefix = `${getCertPrefix(orgId)}-${dateStr}-`;
  const all = await getRows(orgId, SHEETS.INSPECTIONS);
  const serials = all
    .map((r) => r.cert_id)
    .filter(Boolean)
    .map((cid) => {
      if (cid.startsWith(prefix)) return parseInt(cid.slice(prefix.length), 10);
      return NaN;
    })
    .filter((n) => !isNaN(n));
  const next = serials.length > 0 ? Math.max(...serials) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { inspection_id, action, agent_phone, agent_name, booking_id, supervisor_remarks, inspection_result, fail_reason } = req.body;
  if (!inspection_id || !action) return res.status(400).json({ error: 'inspection_id and action required' });

  const orgId = req.user.orgId;

  try {
    const inspection = await findRow(orgId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    const now = new Date().toISOString();

    // ── Supervisor: reopen a rejected entry back to Draft ────────────────────
    if (action === 'reopen') {
      if (inspection.status !== INSPECTION_STATUS.REJECTED) {
        return res.status(400).json({ error: 'Only rejected inspections can be reopened' });
      }
      await updateRow(orgId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
        status:             INSPECTION_STATUS.DRAFT,
        supervisor_remarks: supervisor_remarks || '',
        booking_id:         '',
        updated_at:         now,
      });
      logAudit(orgId, req.user.username, 'REOPEN', inspection_id, inspection.vehicle_number || '').catch(() => {});
      return res.status(200).json({ success: true, status: INSPECTION_STATUS.DRAFT });
    }

    // ── Normal approve / reject — must be Pending ────────────────────────────
    if (inspection.status !== INSPECTION_STATUS.PENDING) {
      return res.status(400).json({ error: 'Inspection is not pending review' });
    }

    const newStatus = action === 'approve' ? INSPECTION_STATUS.APPROVED : INSPECTION_STATUS.REJECTED;

    if (action === 'approve' && !booking_id?.trim()) {
      return res.status(400).json({ error: 'Booking ID is required to approve' });
    }

    const finalBookingId = booking_id ? booking_id.trim().toUpperCase() : '';

    // Handle agent
    if (agent_phone) {
      const existingAgent = await findRow(orgId, SHEETS.AGENTS, 'phone', agent_phone);
      if (!existingAgent) {
        await appendRow(orgId, SHEETS.AGENTS, { phone: agent_phone, name: agent_name || '' });
      } else if (agent_name && !existingAgent.name) {
        await updateRow(orgId, SHEETS.AGENTS, 'phone', agent_phone, { name: agent_name });
      }
    }

    await ensureHeaders(orgId, SHEETS.INSPECTIONS, ['agent_phone', 'agent_name', 'cert_id', 'inspection_result', 'fail_reason']);

    let certId = '';
    if (action === 'approve') {
      certId = await generateCertId(orgId, inspection.test_date);
    }

    await updateRow(orgId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
      status:              newStatus,
      supervisor_username: req.user.username,
      agent_phone:         agent_phone || '',
      agent_name:          agent_name  || '',
      booking_id:          finalBookingId,
      supervisor_remarks:  supervisor_remarks || '',
      inspection_result:   inspection_result || '',
      fail_reason:         inspection_result === 'Fail' ? (fail_reason || '') : '',
      ...(certId ? { cert_id: certId } : {}),
      updated_at:          now,
    });

    const auditAction = action === 'approve' ? 'APPROVE' : 'REJECT';
    logAudit(
      orgId,
      req.user.username,
      auditAction,
      inspection_id,
      inspection.vehicle_number || '',
      inspection_result === 'Fail' ? `Fail: ${fail_reason}` : inspection_result || ''
    ).catch(() => {});

    return res.status(200).json({ success: true, status: newStatus, booking_id: finalBookingId, ...(certId ? { cert_id: certId } : {}) });
  } catch (err) {
    console.error('Review error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Supervisor', 'Admin']);