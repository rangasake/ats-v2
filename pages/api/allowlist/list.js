import { requireAuth } from '../../../lib/auth';
import { ensureHeaders, getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

const HEADERS = ['ts', 'v_num', 'b_num', 'b_nam', 'amt'];

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const org = getOrgByHost(req.headers.host);
    await ensureHeaders(org.sheetId, SHEETS.ALLOW_LIST, HEADERS);
    const rows = await getRows(org.sheetId, SHEETS.ALLOW_LIST);
    const list = rows.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    return res.status(200).json({ allowlist: list, total: list.length });
  } catch (err) {
    console.error('Allow list list error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);