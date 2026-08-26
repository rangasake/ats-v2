// pages/api/vehicle/history.js — last 5 inspections for a vehicle (all roles)
import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { vehicle_number } = req.query;
  if (!vehicle_number) return res.status(400).json({ error: 'vehicle_number required' });

  try {
    const org = getOrgByHost(req.headers.host);
    const rows = await getRows(org.sheetId, SHEETS.INSPECTIONS);
    const history = rows
      .filter((r) => r.vehicle_number?.trim().toUpperCase() === vehicle_number.trim().toUpperCase())
      .sort((a, b) => new Date(b.test_date || b.created_at || 0) - new Date(a.test_date || a.created_at || 0))
      .slice(0, 5)
      .map((r) => ({
        inspection_id:     r.inspection_id,
        test_date:         r.test_date,
        status:            r.status,
        inspection_result: r.inspection_result,
        fail_reason:       r.fail_reason,
        cert_id:           r.cert_id,
        inspector_username: r.inspector_username,
      }));

    return res.status(200).json({ history });
  } catch (err) {
    console.error('Vehicle history error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
