import { requireAuth } from '../../lib/auth';
import { getRows } from '../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const notifications = [];

    // ── 1. Takeover notifications (Inspector + Admin only) ─────────────────
    if (req.user.role === 'Inspector' || req.user.role === 'Admin') {
      const inspRows = await getRows(SHEETS.INSPECTIONS);
      const takeovers = inspRows
        .filter(
          (r) =>
            r.originally_started_by === req.user.username &&
            r.inspector_username    !== req.user.username &&
            r.status                !== INSPECTION_STATUS.DRAFT
        )
        .map((r) => ({
          id:                 `takeover_${r.inspection_id}`,
          type:               'takeover',
          inspection_id:      r.inspection_id,
          vehicle_number:     r.vehicle_number,
          status:             r.status,
          inspector_name:     r.inspector_name || r.inspector_username,
          created_at:         r.updated_at,
        }));
      notifications.push(...takeovers);
    }

    // ── 2. Admin announcements (all roles, filtered by target_role) ────────
    const annRows = await getRows(SHEETS.ANNOUNCEMENTS);
    const announcements = annRows
      .filter(
        (r) =>
          r.id &&
          r.id !== 'deleted' &&
          (r.target_role === 'All' || r.target_role === req.user.role || req.user.role === 'Admin')
      )
      .map((r) => ({
        id:          `ann_${r.id}`,
        type:        'announcement',
        message:     r.message,
        sent_by:     r.sent_by,
        target_role: r.target_role,
        created_at:  r.created_at,
      }));
    notifications.push(...announcements);

    // Sort newest first
    notifications.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.status(200).json({ notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler);
