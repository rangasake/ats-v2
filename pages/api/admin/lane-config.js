import { requireAuth } from '../../../lib/auth';
import { getRows, findRow, updateRow, appendRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const rows = await getRows(SHEETS.LANE_CONFIG);
      return res.status(200).json({ configs: rows });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { lane_type, doc_hidden_items, visual_hidden_items } = req.body;
    if (!lane_type) return res.status(400).json({ error: 'lane_type required' });
    try {
      const existing = await findRow(SHEETS.LANE_CONFIG, 'lane_type', lane_type);
      const payload = {
        lane_type,
        doc_hidden_items: JSON.stringify(doc_hidden_items || []),
        visual_hidden_items: JSON.stringify(visual_hidden_items || []),
      };
      if (existing) {
        await updateRow(SHEETS.LANE_CONFIG, 'lane_type', lane_type, payload);
      } else {
        await appendRow(SHEETS.LANE_CONFIG, payload);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['Admin', 'Inspector', 'Supervisor']);
