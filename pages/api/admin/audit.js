import { requireAuth } from '../../../lib/auth';
import { getRows, ensureHeaders } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'];

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await ensureHeaders(SHEETS.AUDIT_LOG, AUDIT_HEADERS);
    const rows = await getRows(SHEETS.AUDIT_LOG);
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

export default requireAuth(handler, ['Admin']);
