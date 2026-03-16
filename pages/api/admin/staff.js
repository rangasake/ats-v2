import { requireAuth } from '../../../lib/auth';
import { getRows, appendRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const staff = await getRows(SHEETS.STAFF);
      return res.status(200).json({ staff });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  if (req.method === 'POST') {
    const { name, role, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    try {
      await appendRow(SHEETS.STAFF, { name, role: role || 'Inspector', active: active ?? 'true' });
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  return res.status(405).end();
}

export default requireAuth(handler, ['Admin']);
