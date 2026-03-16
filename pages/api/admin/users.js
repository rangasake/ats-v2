import { requireAuth } from '../../../lib/auth';
import { getRows, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const users = await getRows(SHEETS.USERS);
      // never send passwords
      const safe = users.map(({ password, ...u }) => u);
      return res.status(200).json({ users: safe });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { username, password, role, name, active } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, role required' });
    }
    try {
      const existing = await getRows(SHEETS.USERS);
      if (existing.find((u) => u.username === username)) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      if (existing.length >= 10) {
        return res.status(400).json({ error: 'Maximum 10 users allowed' });
      }
      await appendRow(SHEETS.USERS, { username, password, role, name: name || username, active: active ?? 'true' });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const { username, ...updates } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    try {
      await updateRow(SHEETS.USERS, 'username', username, updates);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['Admin']);
