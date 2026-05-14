import { requireAuth } from '../../../lib/auth';
import { ensureHeaders, getRows, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { v4 as uuidv4 } from 'uuid';

const HEADERS = ['id', 'message', 'target_role', 'sent_by', 'created_at'];

async function handler(req, res) {
  await ensureHeaders(SHEETS.ANNOUNCEMENTS, HEADERS);

  // GET — list all announcements (admin management view)
  if (req.method === 'GET') {
    try {
      const rows = await getRows(SHEETS.ANNOUNCEMENTS);
      const list = rows
        .filter((r) => r.id && r.id !== 'deleted')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return res.status(200).json({ announcements: list });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST — create a new announcement
  if (req.method === 'POST') {
    const { message, target_role } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });
    const allowed = ['All', 'Inspector', 'Supervisor'];
    if (!allowed.includes(target_role)) return res.status(400).json({ error: 'invalid target_role' });

    try {
      const id = uuidv4().slice(0, 8).toUpperCase();
      await appendRow(SHEETS.ANNOUNCEMENTS, {
        id,
        message:     message.trim(),
        target_role,
        sent_by:     req.user.name || req.user.username,
        created_at:  new Date().toISOString(),
      });
      return res.status(200).json({ success: true, id });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // DELETE — soft-delete by id
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      await updateRow(SHEETS.ANNOUNCEMENTS, 'id', id, { id: 'deleted' });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['Admin']);
