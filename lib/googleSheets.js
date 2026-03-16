import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    SCOPES
  );
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// ─── Read rows from a sheet tab ───────────────────────────────────────────────
export async function getRows(sheetName) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
}

// ─── Get headers of a sheet ───────────────────────────────────────────────────
export async function getHeaders(sheetName) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!1:1`,
  });
  return (res.data.values || [[]])[0];
}

// ─── Append a row ─────────────────────────────────────────────────────────────
export async function appendRow(sheetName, rowData) {
  const sheets = getSheetsClient();
  const headers = await getHeaders(sheetName);
  const row = headers.map((h) => rowData[h] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

// ─── Update a row by matching a key column ────────────────────────────────────
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
  const sheetRowNum = rowIdx + 1; // 1-indexed
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A${sheetRowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  });
  return true;
}

// ─── Find one row by key ──────────────────────────────────────────────────────
export async function findRow(sheetName, keyCol, keyVal) {
  const rows = await getRows(sheetName);
  return rows.find((r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase()) || null;
}

// ─── Find all rows matching a condition ───────────────────────────────────────
export async function findRows(sheetName, keyCol, keyVal) {
  const rows = await getRows(sheetName);
  return rows.filter((r) => r[keyCol]?.trim().toUpperCase() === String(keyVal).trim().toUpperCase());
}

// ─── Initialize sheets with headers (run once) ───────────────────────────────
export async function initializeSheets() {
  const sheets = getSheetsClient();

  const sheetHeaders = {
    Users: ['username', 'password', 'role', 'name', 'active'],
    Vehicles: ['vehicle_number', 'engine_number', 'chassis_number', 'owner_name', 'owner_phone', 'mandal_name', 'rto_office', 'vehicle_lane', 'lane_type', 'registration_date', 'created_at', 'updated_at'],
    Inspections: ['inspection_id', 'vehicle_number', 'inspector_username', 'status', 'step', 'test_date', 'test_type', 'afms_free_receipt', 'rc', 'last_rc', 'last_rc_expiry', 'puc', 'puc_expiry', 'insurance', 'insurance_expiry', 'insurance_company', 'speed_governor', 'vlt_device', 'visual_data', 'lane_inspector', 'lane_incharge', 'remarks', 'feedback', 'supervisor_username', 'agent_phone', 'agent_name', 'booking_id', 'supervisor_remarks', 'created_at', 'updated_at'],
    LaneConfig: ['lane_type', 'doc_hidden_items', 'visual_hidden_items'],
    InsuranceCompanies: ['name'],
    Staff: ['name', 'role', 'active'],
    Agents: ['phone', 'name'],
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
