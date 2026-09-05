import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const org = getOrgByHost(req.headers.host);
    const rows = await getRows(org.sheetId, SHEETS.VEHICLES);

    // Sort by created_at descending (newest first); fall back to updated_at
    rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.status(200).json({ vehicles: rows });
  } catch (err) {
    console.error('Vehicle list error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);