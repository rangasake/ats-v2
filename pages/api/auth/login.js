import { findRow } from '../../../lib/googleSheets';
import { signToken, setAuthCookie } from '../../../lib/auth';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // const user = await findRow(SHEETS.USERS, 'username', username.trim());
    const org = getOrgByHost(req.headers.host);
    if (!org) {
      return res.status(500).json({ error: 'Organization not configured for this domain' });
    }
    if (!org.sheetId) {
      console.error(`[LOGIN] Missing sheetId for org "${org.id}". Check KONASEEMA_SHEET_ID / KRISHNA_SHEET_ID / DEV_SHEET_ID env vars.`);
      return res.status(500).json({ error: 'Organization sheet is not configured' });
    }
      const user = await findRow(org.sheetId, SHEETS.USERS, 'username', username.trim());

    if (!user || user.active?.toLowerCase() !== 'true') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Compare against bcrypt hash stored in Google Sheets
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const token = signToken(payload);
    setAuthCookie(res, token);

    return res.status(200).json({ user: payload });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
