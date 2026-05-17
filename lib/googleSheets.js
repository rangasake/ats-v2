import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

// ─── Singleton client — reused across warm invocations ────────────────────────
let _sheetsClient = null;
function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    SCOPES
  );
  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

// ─── In-memory cache with per-sheet TTL ───────────────────────────────────────
// Works within warm Vercel function instances (same process).
// Cold starts get fresh data automatically.
const _rowsCache = new Map(); // sheetName → { rows, ts }
const _hdrsCache = new Map(); // sheetName → { headers, ts }

const CACHE_TTL_MS = {
  Inspections:        30_000,  // 30s  — updated frequently
  Vehicles:           60_000,  // 1min — updated on new inspection
  Devices:            60_000,  // 1min
  Agents:            120_000,  // 2min
  Users:             300_000,  // 5min — password changes rare
  Staff:             300_000,  // 5min
  LaneConfig:        600_000,  // 10min — config rarely changes
  InsuranceCompanies:600_000,  // 10min
};
const DEFAULT_TTL_MS = 120_000;

function _isFresh(entry, sheetName) {
  if (!entry) return false;
  return (Date.now() - entry.ts) < (CACHE_TTL_MS[sheetName] ?? DEFAULT_TTL_MS);
}

export function invalidateCache(sheetName) {
  _rowsCache.delete(sheetName);
  _hdrsCache.delete(sheetName);
}

// ─── Read rows from a sheet tab ───────────────────────────────────────────────
export async function getRows(sheetName) {
  const cached = _rowsCache.get(sheetName);
  if (_isFresh(cached, sheetName)) return cached.rows;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const raw = res.data.values || [];
  if (raw.length < 2) {
    _rowsCache.set(sheetName, { rows: [], ts: Date.now() });
    if (raw[0]) _hdrsCache.set(sheetName, { headers: raw[0], ts: Date.now() });
    return [];
  }
  const headers = raw[0];
  const rows = raw.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
  _rowsCache.set(sheetName, { rows, ts: Date.now() });
  _hdrsCache.set(sheetName, { headers, ts: Date.now() });
  return rows;
}

// ─── Get headers of a sheet ───────────────────────────────────────────────────
export async function getHeaders(sheetName) {
  const cached = _hdrsCache.get(sheetName);
  if (_isFresh(cached, sheetName)) return cached.headers;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = (res.data.values || [[]])[0];
  _hdrsCache.set(sheetName, { headers, ts: Date.now() });
  return headers;
}

// ─── Ensure a sheet has required headers without removing existing columns ────
export async function ensureHeaders(sheetName, requiredHeaders) {
  const headers = await getHeaders(sheetName);
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length === 0) return headers;

  const sheets = getSheetsClient();
  const nextHeaders = [...headers, ...missing];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [nextHeaders] },
  });
  // Update headers cache with new columns
  _hdrsCache.set(sheetName, { headers: nextHeaders, ts: Date.now() });
  return nextHeaders;
}

// ─── Append a row ─────────────────────────────────────────────────────────────
export async function appendRow(sheetName, rowData) {
  const headers = await getHeaders(sheetName);
  const row = headers.map((h) => rowData[h] ?? '');
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  invalidateCache(sheetName); // force fresh read next time
}

// ─── Audit log helper ─────────────────────────────────────────────────────────
const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'];

export async function logAudit(actor, action, inspectionId = '', vehicleNumber = '', details = '') {
  try {
    await ensureHeaders('AuditLog', AUDIT_HEADERS);
    await appendRow('AuditLog', {
      timestamp:      new Date().toISOString(),
      actor,
      action,
      inspection_id:  inspectionId,
      vehicle_number: vehicleNumber,
      details,
    });
  } catch (e) {
    console.error('[logAudit] failed:', e.message);
  }
}

// ─── Update a row by matching a key column ────────────────────────────────────
// Always reads fresh from Sheets to get accurate row indices (no cache for writes).
export async function updateRow(sheetName, keyCol, keyVal, updates) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return false;
  const headers = rows[0];
  const keyIdx = headers.indexOf(keyCol);
  if (keyIdx === -1) return false;
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[keyIdx] === String(keyVal));
  if (rowIdx === -1) return false;
  const currentRow = rows[rowIdx];
  const updatedRow = headers.map((h, i) => {
    return updates[h] !== undefined ? updates[h] : (currentRow[i] ?? '');
  });
  const sheetRowNum = rowIdx + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A${sheetRowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  });
  invalidateCache(sheetName); // force fresh read next time
  return true;
}

// ─── Find one row by key ──────────────────────────────────────────────────────
export async function findRow(sheetName, keyCol, keyVal) {
  const rows = await getRows(sheetName);
  return rows.find(
    (r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()
  ) || null;
}

// ─── Find all rows matching a condition ───────────────────────────────────────
export async function findRows(sheetName, keyCol, keyVal) {
  const rows = await getRows(sheetName);
  return rows.filter(
    (r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()
  );
}

// ─── Initialize sheets with headers (run once) ───────────────────────────────
export async function initializeSheets() {
  const sheets = getSheetsClient();
  const sheetHeaders = {
    Users: ['username', 'password', 'role', 'name', 'active'],
    Vehicles: ['vehicle_number', 'engine_number', 'chassis_number', 'meter_reading', 'owner_name', 'owner_phone', 'mandal_name', 'rto_office', 'vehicle_lane', 'lane_type', 'registration_date', 'created_at', 'updated_at'],
    Inspections: ['inspection_id', 'vehicle_number', 'inspector_username', 'status', 'step', 'test_date', 'test_type', 'afms_free_receipt', 'rc', 'last_rc', 'last_rc_expiry', 'puc', 'puc_expiry', 'insurance', 'insurance_expiry', 'insurance_company', 'speed_governor', 'vlt_device', 'visual_data', 'image_urls', 'image_urls_json', 'lat_long', 'lane_inspector', 'lane_incharge', 'remarks', 'feedback', 'supervisor_username', 'agent_phone', 'agent_name', 'booking_id', 'supervisor_remarks', 'inspection_result', 'fail_reason', 'created_at', 'updated_at'],
    AuditLog:    ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'],
    LaneConfig: ['lane_type', 'doc_hidden_items', 'visual_hidden_items'],
    InsuranceCompanies: ['name'],
    Staff: ['name', 'role', 'active'],
    Agents: ['phone', 'name'],
    Devices: ['device_name', 'device_description', 'token', 'status', 'created_at', 'updated_at', 'last_seen', 'created_by'],
  };
  for (const [name, headers] of Object.entries(sheetHeaders)) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    } catch (e) {
      console.error(`Failed to init sheet ${name}:`, e.message);
    }
  }
}