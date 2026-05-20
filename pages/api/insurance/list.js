import { requireAuth } from '../../../lib/auth';
import { getRows } from '../../../lib/googleSheets';
import { SHEETS, INSURANCE_COMPANIES } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const rows = await getRows(req.user.orgId, SHEETS.INSURANCE_COMPANIES);
    // Extract the 'name' column from each row
    const sheetCompanies = rows
      .map((r) => (r.name || '').trim())
      .filter(Boolean);

    // If Google Sheets has data, use it; otherwise fall back to constants
    const companies = sheetCompanies.length > 0 ? sheetCompanies : INSURANCE_COMPANIES;

    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    return res.status(200).json({ companies });
  } catch (err) {
    console.error('Insurance list error:', err);
    return res.status(200).json({ companies: INSURANCE_COMPANIES });
  }
}

export default requireAuth(handler);