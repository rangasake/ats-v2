import { getTokenFromReq, verifyToken } from '../../../lib/auth';

export default function handler(req, res) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
  // Include exp (Unix seconds) so the client can warn before session expires
  return res.status(200).json({ user: { username: user.username, name: user.name, role: user.role, exp: user.exp } });
}
