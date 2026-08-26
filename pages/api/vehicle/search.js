import { requireAuth } from '../../../lib/auth';
import { findRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { vehicle_number } = req.query;
  if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

  try {
    const org = getOrgByHost(req.headers.host);
    const vehicle = await findRow(org.sheetId, SHEETS.VEHICLES, 'vehicle_number', vehicle_number.trim().toUpperCase());
    if (!vehicle) return res.status(404).json({ found: false });
    return res.status(200).json({ found: true, vehicle });
  } catch (err) {
    console.error('Vehicle search error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
