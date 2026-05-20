// pages/api/superadmin/impersonate.js
// Generates a short-lived impersonation token for a target org.
// Only callable by SuperAdmin. The returned token can be exchanged at
// /api/auth/impersonate to log into any org's dashboard.
import jwt                        from 'jsonwebtoken';
import { requireAuth }            from '../../../lib/auth';
import { getOrgByIdAsync }        from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { orgId } = req.body || {};
  if (!orgId) return res.status(400).json({ error: 'orgId required' });
  if (orgId === '__super__') return res.status(400).json({ error: 'Cannot impersonate SuperAdmin org' });

  const org = await getOrgByIdAsync(orgId);
  if (!org) return res.status(404).json({ error: 'Organisation not found' });
  if (!org.active) return res.status(403).json({ error: 'Organisation is inactive' });

  const payload = {
    username:       `__sa_${orgId}__`,
    name:           `SuperAdmin → ${org.name}`,
    role:           'Admin',
    orgId,
    impersonatedBy: '__superadmin__',
    impersonatedAs: req.user.username,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
  return res.status(200).json({ token, orgName: org.name, orgId });
}

export default requireAuth(handler, ['SuperAdmin']);
