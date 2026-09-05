import { requireAuth } from '../../../lib/auth';
import { getRows, findRow, updateRow, appendRow } from '../../../lib/googleSheets';
import { SHEETS, ADMIN_ROLES } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  const org = getOrgByHost(req.headers.host);
  if (req.method === 'GET') {
    try {
      const rows = await getRows(org.sheetId, SHEETS.LANE_CONFIG);
      return res.status(200).json({ configs: rows });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { lane_type, doc_hidden_items, visual_hidden_items } = req.body;
    if (!lane_type) return res.status(400).json({ error: 'lane_type required' });
    try {
      const existing = await findRow(org.sheetId, SHEETS.LANE_CONFIG, 'lane_type', lane_type);
      const payload = {
        lane_type,
        doc_hidden_items: JSON.stringify(doc_hidden_items || []),
        visual_hidden_items: JSON.stringify(visual_hidden_items || []),
      };
      if (existing) {
        await updateRow(org.sheetId, SHEETS.LANE_CONFIG, 'lane_type', lane_type, payload);
      } else {
        await appendRow(org.sheetId, SHEETS.LANE_CONFIG, payload);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, [...ADMIN_ROLES, 'Inspector', 'Supervisor']);
