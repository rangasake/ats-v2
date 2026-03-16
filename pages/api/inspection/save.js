import { requireAuth } from '../../../lib/auth';
import { findRow, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';
import { v4 as uuidv4 } from 'uuid';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { inspection_id, step, ...stepData } = req.body;
  const now = new Date().toISOString();

  try {
    if (inspection_id) {
      // Update existing
      const updates = { ...stepData, step: String(step), updated_at: now };
      await updateRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id, updates);
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
      await appendRow(SHEETS.INSPECTIONS, row);
      return res.status(200).json({ success: true, inspection_id: newId });
    }
  } catch (err) {
    console.error('Inspection save error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', 'Admin']);
