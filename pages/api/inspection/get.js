import { requireAuth } from '../../../lib/auth';
import { findRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const inspection = await findRow(SHEETS.INSPECTIONS, 'inspection_id', id);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    // Inspectors can only see their own
    if (req.user.role === 'Inspector' && inspection.inspector_username !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(200).json({ inspection });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
