import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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
// Updated to use "spreadsheetId:sheetName" as the key to avoid cross-org data leaks.
const _rowsCache = new Map(); 
const _hdrsCache = new Map(); 

const CACHE_TTL_MS = {
  Inspections:        30_000,
  Vehicles:           60_000,
  Devices:            60_000,
  Agents:            120_000,
  Users:             300_000,
  Staff:             300_000,
  LaneConfig:        600_000,
  InsuranceCompanies:600_000,
};
const DEFAULT_TTL_MS = 120_000;

function _isFresh(entry, sheetName) {
  if (!entry) return false;
  return (Date.now() - entry.ts) < (CACHE_TTL_MS[sheetName] ?? DEFAULT_TTL_MS);
}

export function invalidateCache(spreadsheetId, sheetName) {
  const key = `${spreadsheetId}:${sheetName}`;
  _rowsCache.delete(key);
  _hdrsCache.delete(key);
}

// ─── Read rows from a sheet tab ───────────────────────────────────────────────
export async function getRows(spreadsheetId, sheetName) {
  const key = `${spreadsheetId}:${sheetName}`;
  const cached = _rowsCache.get(key);
  if (_isFresh(cached, sheetName)) return cached.rows;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: sheetName,
  });
  const raw = res.data.values || [];
  if (raw.length < 2) {
    _rowsCache.set(key, { rows: [], ts: Date.now() });
    if (raw[0]) _hdrsCache.set(key, { headers: raw[0], ts: Date.now() });
    return [];
  }
  const headers = raw[0];
  const rows = raw.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
  _rowsCache.set(key, { rows, ts: Date.now() });
  _hdrsCache.set(key, { headers, ts: Date.now() });
  return rows;
}

// ─── Get headers of a sheet ───────────────────────────────────────────────────
export async function getHeaders(spreadsheetId, sheetName) {
  const key = `${spreadsheetId}:${sheetName}`;
  const cached = _hdrsCache.get(key);
  if (_isFresh(cached, sheetName)) return cached.headers;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = (res.data.values || [[]])[0];
  _hdrsCache.set(key, { headers, ts: Date.now() });
  return headers;
}

// ─── Ensure a sheet has required headers ──────────────────────────────────────
export async function ensureHeaders(spreadsheetId, sheetName, requiredHeaders) {
  const headers = await getHeaders(spreadsheetId, sheetName);
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length === 0) return headers;

  const sheets = getSheetsClient();
  const nextHeaders = [...headers, ...missing];
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [nextHeaders] },
  });
  _hdrsCache.set(`${spreadsheetId}:${sheetName}`, { headers: nextHeaders, ts: Date.now() });
  return nextHeaders;
}

// ─── Append a row ─────────────────────────────────────────────────────────────
export async function appendRow(spreadsheetId, sheetName, rowData) {
  const headers = await getHeaders(spreadsheetId, sheetName);
  const row = headers.map((h) => rowData[h] ?? '');
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  invalidateCache(spreadsheetId, sheetName);
}

// ─── Audit log helper ─────────────────────────────────────────────────────────
const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'];

export async function logAudit(spreadsheetId, actor, action, inspectionId = '', vehicleNumber = '', details = '') {
  try {
    await ensureHeaders(spreadsheetId, 'AuditLog', AUDIT_HEADERS);
    await appendRow(spreadsheetId, 'AuditLog', {
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
export async function updateRow(spreadsheetId, sheetName, keyCol, keyVal, updates) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
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
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!A${sheetRowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  });
  invalidateCache(spreadsheetId, sheetName);
  return true;
}

// ─── Find one row by key ──────────────────────────────────────────────────────
export async function findRow(spreadsheetId, sheetName, keyCol, keyVal) {
  const rows = await getRows(spreadsheetId, sheetName);
  return rows.find(
    (r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()
  ) || null;
}

// ─── Find all rows matching a condition ───────────────────────────────────────
export async function findRows(spreadsheetId, sheetName, keyCol, keyVal) {
  const rows = await getRows(spreadsheetId, sheetName);
  return rows.filter(
    (r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()
  );
}

// ─── Initialize sheets with headers (run once) ───────────────────────────────
export async function initializeSheets(spreadsheetId) {
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
    mandals: ['mandal', 'rto'],
  };
  for (const [name, headers] of Object.entries(sheetHeaders)) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    } catch (e) {
      console.error(`Failed to init sheet ${name}:`, e.message);
    }
  }
}