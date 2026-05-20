import { google } from 'googleapis';
import { getSheetIdForOrgAsync } from './orgs';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// ─── Singleton auth client — one service account serves all orgs ──────────────
let _auth = null;
function getAuth() {
  if (_auth) return _auth;
  _auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    SCOPES
  );
  return _auth;
}
function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

// ─── Per-org in-memory cache ──────────────────────────────────────────────────
// Keys are `${orgId}:${sheetName}` — impossible to accidentally cross org boundaries.
const _rowsCache = new Map();
const _hdrsCache = new Map();

const CACHE_TTL_MS = {
  Inspections:        30_000,  // 30s
  Vehicles:           60_000,  // 1min
  Devices:            60_000,  // 1min
  Agents:            120_000,  // 2min
  Users:             300_000,  // 5min
  SuperAdmins:       300_000,  // 5min
  Staff:             300_000,  // 5min
  LaneConfig:        600_000,  // 10min
  InsuranceCompanies:600_000,  // 10min
  Config:            300_000,  // 5min
};
const DEFAULT_TTL_MS = 120_000;

function ck(orgId, sheetName) { return `${orgId}:${sheetName}`; }
function _isFresh(entry, sheetName) {
  if (!entry) return false;
  return (Date.now() - entry.ts) < (CACHE_TTL_MS[sheetName] ?? DEFAULT_TTL_MS);
}

export function invalidateCache(orgId, sheetName) {
  _rowsCache.delete(ck(orgId, sheetName));
  _hdrsCache.delete(ck(orgId, sheetName));
}

// ─── Read all rows from a sheet tab ──────────────────────────────────────────
export async function getRows(orgId, sheetName) {
  const key    = ck(orgId, sheetName);
  const cached = _rowsCache.get(key);
  if (_isFresh(cached, sheetName)) return cached.rows;

  const sheetId = await getSheetIdForOrgAsync(orgId);
  const sheets  = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
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

// ─── Get headers of a sheet tab ───────────────────────────────────────────────
export async function getHeaders(orgId, sheetName) {
  const key    = ck(orgId, sheetName);
  const cached = _hdrsCache.get(key);
  if (_isFresh(cached, sheetName)) return cached.headers;

  const sheetId = await getSheetIdForOrgAsync(orgId);
  const sheets  = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = (res.data.values || [[]])[0];
  _hdrsCache.set(key, { headers, ts: Date.now() });
  return headers;
}

// ─── Ensure headers without removing existing columns ─────────────────────────
export async function ensureHeaders(orgId, sheetName, requiredHeaders) {
  const headers = await getHeaders(orgId, sheetName);
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length === 0) return headers;

  const sheetId     = await getSheetIdForOrgAsync(orgId);
  const sheets      = getSheetsClient();
  const nextHeaders = [...headers, ...missing];
  await sheets.spreadsheets.values.update({
    spreadsheetId:   sheetId,
    range:           `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody:     { values: [nextHeaders] },
  });
  _hdrsCache.set(ck(orgId, sheetName), { headers: nextHeaders, ts: Date.now() });
  return nextHeaders;
}

// ─── Append a row ─────────────────────────────────────────────────────────────
export async function appendRow(orgId, sheetName, rowData) {
  const headers = await getHeaders(orgId, sheetName);
  const row     = headers.map((h) => rowData[h] ?? '');
  const sheetId = await getSheetIdForOrgAsync(orgId);
  const sheets  = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId:   sheetId,
    range:           sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody:     { values: [row] },
  });
  invalidateCache(orgId, sheetName);
}

// ─── Audit log ────────────────────────────────────────────────────────────────
const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'];

export async function logAudit(orgId, actor, action, inspectionId = '', vehicleNumber = '', details = '') {
  try {
    await ensureHeaders(orgId, 'AuditLog', AUDIT_HEADERS);
    await appendRow(orgId, 'AuditLog', {
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
export async function updateRow(orgId, sheetName, keyCol, keyVal, updates) {
  const sheetId = await getSheetIdForOrgAsync(orgId);
  const sheets  = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
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
  const updatedRow = headers.map((h, i) =>
    updates[h] !== undefined ? updates[h] : (currentRow[i] ?? '')
  );
  await sheets.spreadsheets.values.update({
    spreadsheetId:   sheetId,
    range:           `${sheetName}!A${rowIdx + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody:     { values: [updatedRow] },
  });
  invalidateCache(orgId, sheetName);
  return true;
}

// ─── Find one row by key ──────────────────────────────────────────────────────
export async function findRow(orgId, sheetName, keyCol, keyVal) {
  const rows = await getRows(orgId, sheetName);
  return rows.find(
    (r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()
  ) || null;
}

// ─── Find all rows matching a key ─────────────────────────────────────────────
export async function findRows(orgId, sheetName, keyCol, keyVal) {
  const rows = await getRows(orgId, sheetName);
  return rows.filter(
    (r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()
  );
}

// ─── Org Config helpers (Config sheet: key | value rows) ──────────────────────
export async function getOrgConfig(orgId, key) {
  try {
    await ensureHeaders(orgId, 'Config', ['key', 'value']);
    const rows = await getRows(orgId, 'Config');
    const row  = rows.find((r) => r.key === key);
    return row?.value ?? null;
  } catch { return null; }
}

export async function setOrgConfig(orgId, key, value) {
  await ensureHeaders(orgId, 'Config', ['key', 'value']);
  const existing = await findRow(orgId, 'Config', 'key', key);
  if (existing) {
    await updateRow(orgId, 'Config', 'key', key, { key, value: String(value) });
  } else {
    await appendRow(orgId, 'Config', { key, value: String(value) });
  }
}

// ─── Initialize all sheet tabs for a new org ─────────────────────────────────
export async function initializeOrgSheets(orgId) {
  const sheetHeaders = {
    Users:               ['username', 'password', 'role', 'name', 'active'],
    Vehicles:            ['vehicle_number', 'engine_number', 'chassis_number', 'meter_reading', 'owner_name', 'owner_phone', 'mandal_name', 'rto_office', 'vehicle_lane', 'lane_type', 'registration_date', 'created_at', 'updated_at'],
    Inspections:         ['inspection_id', 'vehicle_number', 'inspector_username', 'status', 'step', 'test_date', 'test_type', 'afms_free_receipt', 'rc', 'last_rc', 'last_rc_expiry', 'puc', 'puc_expiry', 'insurance', 'insurance_expiry', 'insurance_company', 'speed_governor', 'vlt_device', 'visual_data', 'image_urls', 'image_urls_json', 'lat_long', 'lane_inspector', 'lane_incharge', 'remarks', 'feedback', 'supervisor_username', 'agent_phone', 'agent_name', 'booking_id', 'supervisor_remarks', 'inspection_result', 'fail_reason', 'cert_id', 'created_at', 'updated_at'],
    AuditLog:            ['timestamp', 'actor', 'action', 'inspection_id', 'vehicle_number', 'details'],
    LaneConfig:          ['lane_type', 'doc_hidden_items', 'visual_hidden_items'],
    InsuranceCompanies:  ['name'],
    Staff:               ['name', 'role', 'active'],
    Agents:              ['phone', 'name'],
    Devices:             ['device_name', 'device_description', 'token', 'status', 'created_at', 'updated_at', 'last_seen', 'created_by'],
    Announcements:       ['id', 'message', 'target_role', 'sent_by', 'created_at'],
    Config:              ['key', 'value'],
  };
  for (const [sheet, headers] of Object.entries(sheetHeaders)) {
    try {
      await ensureHeaders(orgId, sheet, headers);
    } catch (e) {
      console.error(`Failed to init sheet ${sheet} for org ${orgId}:`, e.message);
    }
  }
}