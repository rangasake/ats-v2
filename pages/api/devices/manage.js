// pages/api/devices/manage.js
import { requireAuth } from '../../../lib/auth';
import { getRows, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Generate a strong token: AFTS- + 32 hex chars
function generateToken() {
  return 'AFTS-' + uuidv4().replace(/-/g, '').toUpperCase();
}

async function handler(req, res) {
  // ── CREATE new device token ──────────────────────────────────
  if (req.method === 'POST') {
    const { device_name, device_description } = req.body;
    if (!device_name?.trim()) {
      return res.status(400).json({ error: 'device_name is required' });
    }

    try {
      const existing = await getRows(SHEETS.DEVICES);

      // Check duplicate name
      if (existing.find((d) => d.device_name?.toLowerCase() === device_name.trim().toLowerCase())) {
        return res.status(409).json({ error: 'A device with this name already exists' });
      }

      const token = generateToken();
      const now   = new Date().toISOString();

      await appendRow(SHEETS.DEVICES, {
        device_name:        device_name.trim(),
        device_description: device_description?.trim() || '',
        token,
        status:             'active',
        created_at:         now,
        updated_at:         now,
        last_seen:          '',
        created_by:         req.user.username,
      });

      return res.status(200).json({ success: true, token, device_name: device_name.trim() });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // ── UPDATE: revoke / reactivate / rename / regenerate token ──
  if (req.method === 'PUT') {
    const { device_name, action, new_name, device_description } = req.body;
    if (!device_name || !action) {
      return res.status(400).json({ error: 'device_name and action required' });
    }

    try {
      const now = new Date().toISOString();
      let updates = { updated_at: now };

      switch (action) {
        case 'revoke':
          updates.status = 'revoked';
          break;

        case 'activate':
          updates.status = 'active';
          break;

        case 'regenerate':
          // Issue a brand-new token — old token immediately stops working
          updates.token      = generateToken();
          updates.status     = 'active';
          updates.updated_at = now;
          break;

        case 'rename':
          if (!new_name?.trim()) return res.status(400).json({ error: 'new_name required' });
          updates.device_name        = new_name.trim();
          updates.device_description = device_description?.trim() || '';
          break;

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      const ok = await updateRow(SHEETS.DEVICES, 'device_name', device_name, updates);
      if (!ok) return res.status(404).json({ error: 'Device not found' });

      return res.status(200).json({
        success: true,
        ...(updates.token ? { new_token: updates.token } : {}),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['Admin']);