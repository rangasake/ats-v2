import { requireAuth } from '../../../lib/auth';
import { getOrgByHost } from '../../../lib/orgs';
import { getRows } from '../../../lib/googleSheets';
import { ADMIN_ROLES } from '../../../lib/constants';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const org = getOrgByHost(req.headers.host);

    if (!org?.sheetId) {
      return res.status(500).json({
        error: 'Organization sheet not configured',
      });
    }

    const rows = await getRows(
      org.sheetId,
      'mandals'
    );

    const mandalRtoMap = {};

    rows.forEach((row) => {
      const mandal = String(
        row.mandal || ''
      ).trim();

      const rto = String(
        row.rto || ''
      ).trim();

      if (mandal) {
        mandalRtoMap[mandal] = rto;
      }
    });

    return res.status(200).json({
      success: true,
      mandals: Object.keys(mandalRtoMap),
      mandalRtoMap,
    });

  } catch (error) {
    console.error(
      '[MANDALS API] Error:',
      error
    );

    return res.status(500).json({
      error: 'Failed to load mandals',
      details: error.message,
    });
  }
}

export default requireAuth(
  handler,
  ['Inspector', 'Supervisor', ...ADMIN_ROLES]
);