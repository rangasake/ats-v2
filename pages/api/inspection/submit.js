import { requireAuth } from '../../../lib/auth';
import { findRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
   console.log("INSPECTIONS", req.body)
  const { inspection_id, ...finalData } = req.body;
  if (!inspection_id) return res.status(400).json({ error: 'inspection_id required' });

  try {
    const existing = await findRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id);
 
    if (!existing) return res.status(404).json({ error: 'Inspection not found' });

    if (existing.inspector_username !== req.user.username && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await updateRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
      ...finalData,
      status: INSPECTION_STATUS.PENDING,
      step: '4',
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', 'Admin']);
