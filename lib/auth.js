import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'ats-secret-key-change-in-production';
const COOKIE_NAME = 'ats_token';
const MAX_AGE = 60 * 60 * 12; // 12 hours

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
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
  );
}

export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

export function getTokenFromReq(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function requireAuth(handler, allowedRoles = []) {
  return async (req, res) => {
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    return handler(req, res);
  };
}

export { COOKIE_NAME };
