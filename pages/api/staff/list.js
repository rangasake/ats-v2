import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

function isActive(row) {
  const value = String(row.active || 'true').trim().toLowerCase();
  return ['true', 'active', 'yes', '1'].includes(value);
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const org = getOrgByHost(req.headers.host);
    const staff = await getRows(org.sheetId, SHEETS.STAFF);
    const active = staff.filter(isActive);
    res.setHeader('Cache-Control', 'private, max-age=120, stale-while-revalidate=30');
    return res.status(200).json({ staff: active });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
