import { requireAuth } from '../../../lib/auth';
import { ensureHeaders, getRows, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS, ADMIN_ROLES } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

function isDeleted(row) {
  return String(row.active || 'true').trim().toLowerCase() === 'deleted';
}

async function handler(req, res) {
  const org = getOrgByHost(req.headers.host);
  if (req.method === 'GET') {
    try {
      await ensureHeaders(org.sheetId, SHEETS.STAFF, ['name', 'role', 'active']);
      const staff = await getRows(org.sheetId, SHEETS.STAFF);
      const visible = staff.filter((s) => !isDeleted(s));
      return res.status(200).json({ staff: visible });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  if (req.method === 'POST') {
    const { name, role, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    try {
      await ensureHeaders(org.sheetId, SHEETS.STAFF, ['name', 'role', 'active']);
      await appendRow(org.sheetId, SHEETS.STAFF, { name, role: role || 'Inspector', active: active ?? 'true' });
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  if (req.method === 'PUT') {
    const { name, ...updates } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    try {
      await ensureHeaders(org.sheetId, SHEETS.STAFF, ['name', 'role', 'active']);
      const ok = await updateRow(org.sheetId, SHEETS.STAFF, 'name', name, updates);
      if (!ok) return res.status(404).json({ error: 'Staff member not found' });
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  return res.status(405).end();
}

export default requireAuth(handler, ADMIN_ROLES);
