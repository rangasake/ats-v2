import { requireAuth } from '../../../lib/auth';
import { findRow, updateRow, ensureHeaders } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS, ADMIN_ROLES } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { inspection_id } = req.body;
  if (!inspection_id) return res.status(400).json({ error: 'inspection_id required' });

  try {
    const org = getOrgByHost(req.headers.host);
    if (!org?.sheetId) return res.status(500).json({ error: 'Organization sheetId is not configured' });

    await ensureHeaders(org.sheetId, SHEETS.INSPECTIONS, ['originally_started_by']);

    const inspection = await findRow(org.sheetId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    if (inspection.status !== INSPECTION_STATUS.DRAFT) {
      return res.status(400).json({ error: 'Can only take over draft inspections' });
    }

    // Already belongs to this user — no-op
    if (inspection.inspector_username === req.user.username) {
      return res.status(200).json({ success: true, inspection_id });
    }

    await updateRow(org.sheetId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
      inspector_username:    req.user.username,
      inspector_name:        req.user.name || req.user.username,
      // Preserve the original starter; if already taken over before, keep the very first owner
      originally_started_by: inspection.originally_started_by || inspection.inspector_username,
      updated_at:            new Date().toISOString(),
    });

    return res.status(200).json({ success: true, inspection_id });
  } catch (err) {
    console.error('Takeover error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', ...ADMIN_ROLES]);
