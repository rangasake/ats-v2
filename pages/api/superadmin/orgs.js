// pages/api/superadmin/orgs.js — SuperAdmin: full org management CRUD
import { requireAuth }        from '../../../lib/auth';
import { getAllOrgsAsync, getOrgSheetsClient, invalidateOrgsCache } from '../../../lib/orgs';
import { getRows, appendRow, updateRow } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';

const ORGS_SHEET_ID = () => process.env.SUPERADMIN_SHEET_ID;
const ORGS_TAB      = 'orgs';
const ORG_HEADERS   = ['org_id','org_name','org_domain','org_sheetid','active_inactive',
                        'primary_color','accent_color','logo_text','subtitle','cert_prefix','created_at'];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getOrgRows() {
  const sheets = getOrgSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ORGS_SHEET_ID(),
    range: `${ORGS_TAB}!A:Z`,
  });
  const raw = res.data.values || [];
  if (raw.length < 1) return { headers: [], rows: [] };
  const headers = raw[0];
  const rows = raw.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  }).filter((r) => r.org_id);
  return { headers, rows };
}

async function ensureOrgsTab() {
  const sheets = getOrgSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ORGS_SHEET_ID() });
  const existing = meta.data.sheets.map((s) => s.properties.title);
  if (!existing.includes(ORGS_TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGS_SHEET_ID(),
      requestBody: { requests: [{ addSheet: { properties: { title: ORGS_TAB } } }] },
    });
  }
  // Ensure headers row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ORGS_SHEET_ID(),
    range: `${ORGS_TAB}!A1:Z1`,
  });
  if (!res.data.values?.[0]?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: ORGS_SHEET_ID(),
      range: `${ORGS_TAB}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ORG_HEADERS] },
    });
  }
}

function orgRowToResponse(row) {
  return {
    id:           row.org_id,
    name:         row.org_name,
    domain:       row.org_domain,
    sheetId:      row.org_sheetid,
    active:       row.active_inactive === 'active',
    primaryColor: row.primary_color  || '#1e3a8a',
    accentColor:  row.accent_color   || '#2563eb',
    logoText:     row.logo_text      || row.org_name,
    subtitle:     row.subtitle       || 'Vehicle Fitness Testing Station',
    certPrefix:   row.cert_prefix    || 'ATS',
    createdAt:    row.created_at     || '',
  };
}

async function handler(req, res) {
  if (!ORGS_SHEET_ID()) return res.status(500).json({ error: 'SUPERADMIN_SHEET_ID not configured' });

  // ── GET — list all orgs with stats ──────────────────────────────────────────
  if (req.method === 'GET') {
    await ensureOrgsTab();
    const { rows } = await getOrgRows();

    const statsResults = await Promise.allSettled(
      rows.map(async (row) => {
        const orgId = row.org_id;
        if (!row.org_sheetid) {
          return { ...orgRowToResponse(row), stats: null, error: 'No sheet ID configured' };
        }
        const [inspections, users, devices] = await Promise.all([
          getRows(orgId, SHEETS.INSPECTIONS).catch(() => []),
          getRows(orgId, SHEETS.USERS).catch(() => []),
          getRows(orgId, SHEETS.DEVICES).catch(() => []),
        ]);
        return {
          ...orgRowToResponse(row),
          stats: {
            totalInspections: inspections.length,
            pendingReview:    inspections.filter((i) => i.status === 'Pending').length,
            approved:         inspections.filter((i) => i.status === 'Approved').length,
            activeUsers:      users.filter((u) => u.active === 'true').length,
            activeDevices:    devices.filter((d) => d.status === 'active').length,
          },
        };
      })
    );

    const orgs = statsResults.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { ...orgRowToResponse(rows[i]), stats: null, error: r.reason?.message }
    );

    return res.status(200).json({ orgs });
  }

  // ── POST — add new org ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { org_id, org_name, org_domain, org_sheetid,
            primary_color, accent_color, logo_text, subtitle, cert_prefix } = req.body || {};

    if (!org_id || !org_name || !org_domain || !org_sheetid) {
      return res.status(400).json({ error: 'org_id, org_name, org_domain, org_sheetid are required' });
    }
    // Validate org_id is a slug
    if (!/^[a-z0-9_-]+$/.test(org_id)) {
      return res.status(400).json({ error: 'org_id must be lowercase alphanumeric (a-z, 0-9, -, _)' });
    }

    await ensureOrgsTab();
    const { rows } = await getOrgRows();
    if (rows.find((r) => r.org_id === org_id)) {
      return res.status(409).json({ error: `Org "${org_id}" already exists` });
    }
    if (rows.find((r) => r.org_domain === org_domain)) {
      return res.status(409).json({ error: `Domain "${org_domain}" already in use` });
    }

    const newRow = ORG_HEADERS.map((h) => ({
      org_id:           org_id.toLowerCase().trim(),
      org_name:         org_name.trim(),
      org_domain:       org_domain.toLowerCase().trim(),
      org_sheetid:      org_sheetid.trim(),
      active_inactive:  'active',
      primary_color:    primary_color  || '#1e3a8a',
      accent_color:     accent_color   || '#2563eb',
      logo_text:        logo_text      || org_name.trim(),
      subtitle:         subtitle       || 'Vehicle Fitness Testing Station',
      cert_prefix:      cert_prefix    || org_id.toUpperCase().slice(0, 5),
      created_at:       new Date().toISOString(),
    }[h] ?? ''));

    const sheets = getOrgSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId:    ORGS_SHEET_ID(),
      range:            `${ORGS_TAB}!A:K`,
      valueInputOption: 'RAW',
      requestBody:      { values: [newRow] },
    });

    invalidateOrgsCache();
    return res.status(201).json({ success: true, org_id });
  }

  // ── PUT — update org ─────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { org_id, ...updates } = req.body || {};
    if (!org_id) return res.status(400).json({ error: 'org_id required' });

    await ensureOrgsTab();
    const sheets = getOrgSheetsClient();

    // Find the row index
    const res2 = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGS_SHEET_ID(),
      range: `${ORGS_TAB}!A:Z`,
    });
    const raw = res2.data.values || [];
    if (raw.length < 2) return res.status(404).json({ error: 'Org not found' });
    const headers = raw[0];
    const rowIdx = raw.findIndex((r, i) => i > 0 && r[headers.indexOf('org_id')] === org_id);
    if (rowIdx === -1) return res.status(404).json({ error: 'Org not found' });

    const currentRow = raw[rowIdx];
    const allowedUpdates = ['org_name','org_domain','org_sheetid','active_inactive',
                            'primary_color','accent_color','logo_text','subtitle','cert_prefix'];
    const updatedRow = headers.map((h, i) =>
      allowedUpdates.includes(h) && updates[h] !== undefined ? updates[h] : (currentRow[i] ?? '')
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId:    ORGS_SHEET_ID(),
      range:            `${ORGS_TAB}!A${rowIdx + 1}`,
      valueInputOption: 'RAW',
      requestBody:      { values: [updatedRow] },
    });

    invalidateOrgsCache();
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['SuperAdmin']);

