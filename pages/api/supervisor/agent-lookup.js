import { requireAuth } from '../../../lib/auth';
import { findRow, appendRow } from '../../../lib/googleSheets';
import { SHEETS, ADMIN_ROLES } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  const org = getOrgByHost(req.headers.host);
  if (req.method === 'GET') {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'phone required' });
    try {
      const agent = await findRow(org.sheetId, SHEETS.AGENTS, 'phone', phone.trim());
      if (!agent) return res.status(404).json({ found: false });
      return res.status(200).json({ found: true, agent });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { phone, name } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'phone and name required' });
    try {
      const existing = await findRow(org.sheetId, SHEETS.AGENTS, 'phone', phone.trim());
      if (existing) return res.status(409).json({ error: 'Agent already exists' });
      await appendRow(org.sheetId, SHEETS.AGENTS, { phone: phone.trim(), name: name.trim() });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['Supervisor', ...ADMIN_ROLES]);
