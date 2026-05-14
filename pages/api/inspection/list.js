import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { status, username } = req.query;
  try {
    let rows = await getRows(SHEETS.INSPECTIONS);

    if (req.user.role === 'Inspector') {
      // Show inspections they own OR originally started (so they see takeover notifications)
      rows = rows.filter(
        (r) => r.inspector_username === req.user.username ||
               r.originally_started_by === req.user.username
      );
    }
    if (status) {
      rows = rows.filter((r) => r.status === status);
    }
    if (username) {
      rows = rows.filter((r) => r.inspector_username === username);
    }

    // Sort by updated_at descending
    rows.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    return res.status(200).json({ inspections: rows });
  } catch (err) {
    console.error('List error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
