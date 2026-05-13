import { requireAuth } from '../../../lib/auth';
import { ensureHeaders, findRow, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

const VEHICLE_FIELDS = [
  'vehicle_number',
  'engine_number',
  'chassis_number',
  'meter_reading',
  'owner_name',
  'owner_phone',
  'mandal_name',
  'rto_office',
  'vehicle_lane',
  'lane_type',
  'registration_date',
];

const VEHICLE_HEADERS = [...VEHICLE_FIELDS, 'created_at', 'updated_at'];

function buildVehiclePayload(data, vehicleNumber) {
  return VEHICLE_FIELDS.reduce((payload, field) => {
    if (field === 'vehicle_number') {
      payload.vehicle_number = vehicleNumber;
      return payload;
    }

    if (data[field] !== undefined) {
      payload[field] = data[field];
    }
    return payload;
  }, {});
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const data = req.body;
  if (!data.vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

  const vn = data.vehicle_number.trim().toUpperCase();
  const now = new Date().toISOString();

  try {
    await ensureHeaders(SHEETS.VEHICLES, VEHICLE_HEADERS);
    const vehiclePayload = buildVehiclePayload(data, vn);
    const existing = await findRow(SHEETS.VEHICLES, 'vehicle_number', vn);
    if (existing) {
      const ok = await updateRow(SHEETS.VEHICLES, 'vehicle_number', vn, {
        ...vehiclePayload,
        created_at: existing.created_at || now,
        updated_at: now,
      });
      if (!ok) return res.status(404).json({ error: 'Vehicle not found' });
      return res.status(200).json({ success: true, action: 'updated' });
    } else {
      await appendRow(SHEETS.VEHICLES, {
        ...vehiclePayload,
        created_at: now,
        updated_at: now,
      });
      return res.status(200).json({ success: true, action: 'created' });
    }
  } catch (err) {
    console.error('Vehicle save error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', 'Admin']);
