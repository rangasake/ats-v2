/**
 * One-time setup script for a new org.
 * Usage:
 *   node scripts/setup-org.mjs <orgId> <adminUsername> <adminPassword> <adminName>
 *
 * Example:
 *   node scripts/setup-org.mjs krishna admin Admin@123 "Krishna Admin"
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local manually (no dotenv dep needed) ───────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // strip surrounding single or double quotes
    if ((val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Args ──────────────────────────────────────────────────────────────────────
const [,, orgId, adminUsername, adminPassword, ...nameParts] = process.argv;
const adminName = nameParts.join(' ') || adminUsername;

if (!orgId || !adminUsername || !adminPassword) {
  console.error('Usage: node scripts/setup-org.mjs <orgId> <adminUsername> <adminPassword> [adminName]');
  console.error('Example: node scripts/setup-org.mjs krishna admin Admin@123 "Krishna Admin"');
  process.exit(1);
}

// ── Resolve sheet ID ──────────────────────────────────────────────────────────
function getSheetId(orgId) {
  if (orgId === '__super__') return process.env.SUPERADMIN_SHEET_ID || null;
  try {
    const configs = JSON.parse(process.env.ORG_CONFIGS || '[]');
    const org = configs.find(o => o.id === orgId);
    return org ? (process.env[org.sheetIdKey] || null) : null;
  } catch { return null; }
}

const sheetId = getSheetId(orgId);
if (!sheetId) {
  console.error(`Org "${orgId}" not found in ORG_CONFIGS, or its sheet ID env var is not set.`);
  process.exit(1);
}

console.log(`\nOrg: ${orgId}`);
console.log(`Sheet ID: ${sheetId}`);
console.log(`Admin user: ${adminUsername} / ${adminName}\n`);

// ── Google Sheets auth ────────────────────────────────────────────────────────
const { google } = await import('googleapis');
const { default: bcrypt } = await import('bcryptjs');

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// ── Ensure a sheet tab exists with given headers ──────────────────────────────
async function ensureTab(tabName, headers) {
  // Check if tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existing = meta.data.sheets.map(s => s.properties.title);

  if (!existing.includes(tabName)) {
    // Create the tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
    console.log(`  Created tab: ${tabName}`);
  }

  // Check/set headers
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:Z1`,
  });
  const existingHeaders = (res.data.values?.[0] || []);
  const missing = headers.filter(h => !existingHeaders.includes(h));
  const allHeaders = [...existingHeaders, ...missing];

  if (missing.length > 0 || existingHeaders.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [allHeaders] },
    });
    console.log(`  Headers set for ${tabName}: ${allHeaders.join(', ')}`);
  } else {
    console.log(`  Tab "${tabName}" already has headers.`);
  }
}

// ── All sheet tabs & headers ──────────────────────────────────────────────────
const TABS = {
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

console.log('Initializing sheet tabs...');
for (const [tab, headers] of Object.entries(TABS)) {
  await ensureTab(tab, headers);
}

// ── Add admin user ─────────────────────────────────────────────────────────────
console.log('\nCreating admin user...');

// Check if user already exists
const usersRes = await sheets.spreadsheets.values.get({
  spreadsheetId: sheetId,
  range: 'Users!A:A',
});
const usernames = (usersRes.data.values || []).flat().slice(1); // skip header
if (usernames.includes(adminUsername)) {
  console.log(`  User "${adminUsername}" already exists — skipping.`);
} else {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Users!A:E',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[adminUsername, hashedPassword, 'Admin', adminName, 'true']],
    },
  });
  console.log(`  Admin user "${adminUsername}" created.`);
}

console.log('\n✅ Setup complete!');
console.log(`\nYou can now log in at http://localhost:3000 with:`);
console.log(`  Username: ${adminUsername}`);
console.log(`  Password: ${adminPassword}`);
console.log(`\nRemember to set ORG_DEV_ID=${orgId} in .env.local to test this org locally.`);
