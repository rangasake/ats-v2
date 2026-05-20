// pages/api/auth/impersonate.js
// Validates a SuperAdmin impersonation token, sets the auth cookie, and redirects
// to /dashboard of the target org.
// Works locally (ORG_DEV_ID=__super__) and in production (org's own domain).
import jwt                  from 'jsonwebtoken';
import { setAuthCookie }    from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).send('Invalid or expired impersonation token');
  }

  if (payload.impersonatedBy !== '__superadmin__') {
    return res.status(403).send('Not an impersonation token');
  }

  // Set the impersonation JWT as the auth cookie and redirect to dashboard
  setAuthCookie(res, token);
  res.writeHead(302, { Location: '/dashboard' });
  res.end();
}
