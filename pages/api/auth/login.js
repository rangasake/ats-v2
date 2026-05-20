import { findRow } from '../../../lib/googleSheets';
import { signToken, setAuthCookie } from '../../../lib/auth';
import { getOrgByHost } from '../../../lib/orgs';
import { SHEETS } from '../../../lib/constants';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Resolve org from hostname — every login is org-scoped
  const org = getOrgByHost(req.headers.host);
  if (!org) return res.status(400).json({ error: 'Unknown organisation' });

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // SuperAdmin uses its own credentials sheet; regular users use their org's sheet
    const sheetName = org.id === '__super__' ? SHEETS.SUPERADMINS : SHEETS.USERS;
    const user = await findRow(org.id, sheetName, 'username', username.trim());

    if (!user || user.active?.toLowerCase() !== 'true') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      username: user.username,
      name:     user.name,
      role:     user.role,
      orgId:    org.id,   // ← baked into JWT; validated on every request
    };

    const token = signToken(payload);
    setAuthCookie(res, token);
    return res.status(200).json({ user: payload });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
