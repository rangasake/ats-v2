// pages/api/auth/renew.js — re-issue JWT while current one is still valid
import { getTokenFromReq, verifyToken, signToken, setAuthCookie } from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Session expired — please log in again' });

  // Issue a fresh token with the same payload
  const newToken = signToken({ username: user.username, name: user.name, role: user.role });
  setAuthCookie(res, newToken);

  const renewed = verifyToken(newToken);
  return res.status(200).json({ success: true, exp: renewed.exp });
}
