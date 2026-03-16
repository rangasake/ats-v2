import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const staff = await getRows(SHEETS.STAFF);
    const active = staff.filter((s) => s.active?.toLowerCase() !== 'false');
    return res.status(200).json({ staff: active });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
