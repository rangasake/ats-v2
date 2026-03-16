import { requireAuth } from '../../../lib/auth';
import { findRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  try {
    const agent = await findRow(SHEETS.AGENTS, 'phone', phone.trim());
    if (!agent) return res.status(404).json({ found: false });
    return res.status(200).json({ found: true, agent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Supervisor', 'Admin']);
