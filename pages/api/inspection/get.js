import { requireAuth } from '../../../lib/auth';
import { findRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const org = getOrgByHost(req.headers.host);
    const inspection = await findRow(org.sheetId, SHEETS.INSPECTIONS, 'inspection_id', id);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    // Read-only for all authenticated users. Existence of a record is enough;
    // edit/write protection is enforced in save.js / submit.js / takeover.js.
    return res.status(200).json({ inspection });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
