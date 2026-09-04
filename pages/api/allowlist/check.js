import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { vehicle_number } = req.query;
  if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

  try {
    const org = getOrgByHost(req.headers.host);
    const vn = vehicle_number.trim().toUpperCase();
    const rows = await getRows(org.sheetId, SHEETS.ALLOW_LIST);
    const match = rows.find((r) => String(r.v_num || '').trim().toUpperCase() === vn);
    return res.status(200).json({ allowed: !!match });
  } catch (err) {
    console.error('Allow list check error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);