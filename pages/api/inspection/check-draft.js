import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { vehicle_number } = req.query;
  if (!vehicle_number) return res.status(400).json({ error: 'vehicle_number required' });

  try {
    const rows = await getRows(SHEETS.INSPECTIONS);
    const drafts = rows
      .filter((r) => r.vehicle_number === vehicle_number && r.status === INSPECTION_STATUS.DRAFT)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    if (drafts.length === 0) return res.status(200).json({ draft: null });

    const d = drafts[0];
    return res.status(200).json({
      draft: {
        inspection_id:      d.inspection_id,
        inspector_username: d.inspector_username,
        step:               d.step || '1',
        updated_at:         d.updated_at,
      },
    });
  } catch (err) {
    console.error('check-draft error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
