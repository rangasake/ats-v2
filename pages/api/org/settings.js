// pages/api/org/settings.js — Org-specific runtime settings (requires auth)
// Serves mandals, lane types, feature flags from the org's Config sheet.
// Falls back to constants.js defaults if not configured in the sheet.
import { requireAuth } from '../../../lib/auth';
import { getOrgConfig, setOrgConfig } from '../../../lib/googleSheets';
import { getOrgById } from '../../../lib/orgs';
import { MANDALS, LANE_TYPES, VEHICLE_LANES } from '../../../lib/constants';

const DEFAULT_FEATURES = {
  supervisor_enabled:  true,
  roles_available:     ['Admin', 'Supervisor', 'Inspector'],
  inspection_steps:    [1, 2, 3, 4],
};

const ALLOWED_KEYS = [
  'mandals',
  'lane_types',
  'vehicle_lanes',
  'features',
  'brand_primary_color',
  'brand_accent_color',
  'brand_logo_text',
  'brand_subtitle',
];

async function handler(req, res) {
  const org = getOrgById(req.user.orgId);
  if (!org) return res.status(403).json({ error: 'Unknown org' });

  if (req.method === 'GET') {
    const [mandalsRaw, laneTypesRaw, vehicleLanesRaw, featuresRaw] = await Promise.all([
      getOrgConfig(req.user.orgId, 'mandals'),
      getOrgConfig(req.user.orgId, 'lane_types'),
      getOrgConfig(req.user.orgId, 'vehicle_lanes'),
      getOrgConfig(req.user.orgId, 'features'),
    ]);

    return res.status(200).json({
      mandals:      mandalsRaw      ? JSON.parse(mandalsRaw)      : MANDALS,
      laneTypes:    laneTypesRaw    ? JSON.parse(laneTypesRaw)    : LANE_TYPES,
      vehicleLanes: vehicleLanesRaw ? JSON.parse(vehicleLanesRaw) : VEHICLE_LANES,
      features:     featuresRaw     ? JSON.parse(featuresRaw)     : DEFAULT_FEATURES,
    });
  }

  if (req.method === 'PUT') {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Unknown setting key' });
    const stored = typeof value === 'string' ? value : JSON.stringify(value);
    await setOrgConfig(req.user.orgId, key, stored);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default requireAuth(handler);
