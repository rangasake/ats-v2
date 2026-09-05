// pages/api/devices/list.js
import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS, ADMIN_ROLES } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const org = getOrgByHost(req.headers.host);
    const devices = await getRows(org.sheetId, SHEETS.DEVICES);
    // Never expose the raw token to non-admin — mask it
    const safe = devices.map((d) => ({
      ...d,
      token: ADMIN_ROLES.includes(req.user.role)
        ? d.token
        : d.token?.slice(0, 6) + '••••••••••••••••••••••••',
    }));
    return res.status(200).json({ devices: safe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ADMIN_ROLES);