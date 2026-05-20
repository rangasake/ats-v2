import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const rows = await getRows(req.user.orgId, SHEETS.INSPECTIONS);
    // Return inspections this user originally started but someone else took over and progressed
    const notifications = rows
      .filter(
        (r) =>
          r.originally_started_by === req.user.username &&
          r.inspector_username    !== req.user.username &&
          r.status                !== INSPECTION_STATUS.DRAFT
      )
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
      .map((r) => ({
        inspection_id:      r.inspection_id,
        vehicle_number:     r.vehicle_number,
        status:             r.status,
        inspector_username: r.inspector_username,
        inspector_name:     r.inspector_name || r.inspector_username,
        updated_at:         r.updated_at,
      }));

    return res.status(200).json({ notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
