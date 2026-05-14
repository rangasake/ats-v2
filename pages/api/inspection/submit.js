import { requireAuth } from '../../../lib/auth';
import { findRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS, INSPECTION_STATUS } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { inspection_id, ...finalData } = req.body;
  if (!inspection_id) return res.status(400).json({ error: 'inspection_id required' });

  // Server-side validation of required fields before accepting submission
  const REQUIRED_FIELDS = [
    { field: 'test_date',       label: 'Test Date' },
    { field: 'test_type',       label: 'Test Type' },
    { field: 'lane_inspector',  label: 'Lane Inspector' },
    { field: 'lane_incharge',   label: 'Lane Incharge' },
  ];

  const missing = REQUIRED_FIELDS
    .filter(({ field }) => !finalData[field] && !finalData[field])
    .map(({ label }) => label);

  // Also check against existing inspection data (fields may have been saved in earlier steps)
  // We'll do this check after fetching the existing row below.

  try {
    const existing = await findRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id);

    if (!existing) return res.status(404).json({ error: 'Inspection not found' });

    if (existing.inspector_username !== req.user.username && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Merge incoming data with saved data to evaluate completeness
    const merged = { ...existing, ...finalData };
    const missingFields = REQUIRED_FIELDS
      .filter(({ field }) => !merged[field])
      .map(({ label }) => label);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    await updateRow(SHEETS.INSPECTIONS, 'inspection_id', inspection_id, {
      ...finalData,
      status: INSPECTION_STATUS.PENDING,
      step: '4',
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default requireAuth(handler, ['Inspector', 'Admin']);
