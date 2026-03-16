import { requireAuth } from '../../../lib/auth';
import { findRow, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const data = req.body;
  if (!data.vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

  const vn = data.vehicle_number.trim().toUpperCase();
  const now = new Date().toISOString();

  try {
    const existing = await findRow(SHEETS.VEHICLES, 'vehicle_number', vn);
    if (existing) {
      await updateRow(SHEETS.VEHICLES, 'vehicle_number', vn, { ...data, vehicle_number: vn, updated_at: now });
      return res.status(200).json({ success: true, action: 'updated' });
    } else {
      await appendRow(SHEETS.VEHICLES, { ...data, vehicle_number: vn, created_at: now, updated_at: now });
      return res.status(200).json({ success: true, action: 'created' });
    }
  } catch (err) {
    console.error('Vehicle save error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', 'Admin']);
