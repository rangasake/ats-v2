import { requireAuth } from '../../../lib/auth';
import { ensureHeaders, findRow, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';
import { v4 as uuidv4 } from 'uuid';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { inspection_id, step, ...stepData } = req.body;
  const now = new Date().toISOString();

  try {
    const org = getOrgByHost(req.headers.host);
    await ensureHeaders(org.sheetId, SHEETS.INSPECTIONS, ['lat_long']);

    if (String(step) === '3' && !stepData.lat_long?.trim() && stepData.lat_long !== undefined) {
      return res.status(400).json({ error: 'Vehicle location is required' });
    }

    if (inspection_id) {
      // Update existing
      const existing = await findRow(org.sheetId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id);
      if (!existing) return res.status(404).json({ error: 'Inspection not found' });
      if (existing.inspector_username !== req.user.username && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // step is optional — omit it to update fields without changing the step counter
      const updates = {
        ...stepData,
        ...(step !== undefined ? { step: String(step) } : {}),
        updated_at: now,
      };
      const ok = await updateRow(org.sheetId, SHEETS.INSPECTIONS, 'inspection_id', inspection_id, updates);
      if (!ok) return res.status(404).json({ error: 'Inspection not found' });
      return res.status(200).json({ success: true, inspection_id });
    } else {
      // Create new
      const newId = uuidv4().slice(0, 8).toUpperCase();
      const row = {
        inspection_id: newId,
        inspector_username: req.user.username,
        status: INSPECTION_STATUS.DRAFT,
        step: String(step),
        ...stepData,
        created_at: now,
        updated_at: now,
      };
      await appendRow(org.sheetId, SHEETS.INSPECTIONS, row);
      return res.status(200).json({ success: true, inspection_id: newId });
    }
  } catch (err) {
    console.error('Inspection save error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', 'Admin']);
