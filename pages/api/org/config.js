// pages/api/org/config.js — PUBLIC branding endpoint
// Returns only visual branding — sheet IDs and secrets are NEVER exposed.
// For impersonation sessions, uses the token's orgId rather than host-resolved org.
import { getOrgByHostAsync, getOrgByIdAsync } from '../../../lib/orgs';
import { getOrgConfig }                        from '../../../lib/googleSheets';
import { getTokenFromReq, verifyToken }        from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Impersonation: JWT orgId overrides host resolution
  let org = null;
  let isImpersonating = false;
  const rawToken = getTokenFromReq(req);
  if (rawToken) {
    const user = verifyToken(rawToken);
    if (user?.impersonatedBy === '__superadmin__' && user.orgId) {
      org = await getOrgByIdAsync(user.orgId);
      isImpersonating = true;
    }
  }
  if (!org) org = await getOrgByHostAsync(req.headers.host);
  if (!org) return res.status(404).json({ error: 'Unknown organisation' });

  const [primaryColor, accentColor, logoText, subtitle] = await Promise.all([
    getOrgConfig(org.id, 'brand_primary_color'),
    getOrgConfig(org.id, 'brand_accent_color'),
    getOrgConfig(org.id, 'brand_logo_text'),
    getOrgConfig(org.id, 'brand_subtitle'),
  ]);

  // Don't cache impersonation responses — they are session-specific
  res.setHeader('Cache-Control', isImpersonating ? 'no-store' : 'public, max-age=300, stale-while-revalidate=60');
  return res.status(200).json({
    id:           org.id,
    name:         org.name,
    primaryColor: primaryColor || org.primaryColor,
    accentColor:  accentColor  || org.accentColor,
    logoText:     logoText     || org.logoText,
    subtitle:     subtitle     || org.subtitle || 'Vehicle Fitness Testing Station',
  });
}
