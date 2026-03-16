// pages/api/devices/list.js
import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const devices = await getRows(SHEETS.DEVICES);
    // Never expose the raw token to non-admin — mask it
    const safe = devices.map((d) => ({
      ...d,
      token: req.user.role === 'Admin'
        ? d.token
        : d.token?.slice(0, 6) + '••••••••••••••••••••••••',
    }));
    return res.status(200).json({ devices: safe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Admin']);