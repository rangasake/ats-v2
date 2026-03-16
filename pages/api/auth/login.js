import { findRow } from '../../../lib/googleSheets';
import { signToken, setAuthCookie } from '../../../lib/auth';
import { SHEETS } from '../../../lib/constants';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await findRow(SHEETS.USERS, 'username', username.trim());

    if (!user || user.active?.toLowerCase() !== 'true') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Plain text password comparison (stored in Google Sheets)
    if (user.password !== password) {
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
