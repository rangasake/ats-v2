import jwt from 'jsonwebtoken';
import { getOrgByHostAsync } from './orgs';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'ats_token';
const MAX_AGE = 60 * 60 * 12; // 12 hours
const IS_PROD = process.env.NODE_ENV === 'production';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookie(res, token) {
  const secure = IS_PROD ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
  );
}

export function clearAuthCookie(res) {
  const secure = IS_PROD ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`
  );
}

export function getTokenFromReq(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function requireAuth(handler, allowedRoles = []) {
  return async (req, res) => {
    // 1. Verify JWT
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. Role check
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 3. ── CRITICAL: org isolation ──────────────────────────────────────────
    // The JWT's orgId MUST match the org resolved from the request's Host header.
    // This prevents a token issued for org-A from ever accessing org-B's data.
    const requestOrg = await getOrgByHostAsync(req.headers.host);
    if (!requestOrg) {
      return res.status(403).json({ error: 'Unknown organisation' });
    }

    if (user.role === 'SuperAdmin') {
      // SuperAdmin tokens are only valid on the designated superadmin domain
      if (requestOrg.id !== '__super__') {
        return res.status(403).json({ error: 'SuperAdmin token not valid on this domain' });
      }
    } else if (user.impersonatedBy === '__superadmin__') {
      // Impersonation token issued by SuperAdmin — skip host check, just verify org exists
      const targetOrg = await getOrgByIdAsync(user.orgId);
      if (!targetOrg) {
        return res.status(403).json({ error: 'Impersonated org not found' });
      }
    } else {
      // Regular users: JWT orgId must exactly match the hostname's org
      if (!user.orgId || user.orgId !== requestOrg.id) {
        return res.status(403).json({ error: 'Token does not belong to this organisation' });
      }
    }
    // ── end org isolation ──────────────────────────────────────────────────

    req.user = user;
    return handler(req, res);
  };
}

export { COOKIE_NAME };
