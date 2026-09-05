import { requireAuth } from '../../../lib/auth';
import { getRows, ensureHeaders } from '../../../lib/googleSheets';
import { SHEETS, ADMIN_ROLES } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'];

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const org = getOrgByHost(req.headers.host);
    await ensureHeaders(org.sheetId, SHEETS.AUDIT_LOG, AUDIT_HEADERS);
    const rows = await getRows(org.sheetId, SHEETS.AUDIT_LOG);
    // Newest first
    const sorted = [...rows].sort((a, b) =>
      (b.timestamp || '').localeCompare(a.timestamp || '')
    );
    return res.status(200).json({ logs: sorted });
  } catch (err) {
    console.error('Audit log error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ADMIN_ROLES);
