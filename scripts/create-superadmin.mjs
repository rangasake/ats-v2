#!/usr/bin/env node
/**
 * create-superadmin.mjs
 * Creates a SuperAdmin user in the SuperAdmins tab of the SuperAdmin sheet.
 *
 * Usage:
 *   node scripts/create-superadmin.mjs <username> <password> [name]
 *
 * Example:
 *   node scripts/create-superadmin.mjs superadmin Admin@123 "Super Admin"
 */
import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { google }       from 'googleapis';
import bcrypt           from 'bcryptjs';

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
const raw = readFileSync(envPath, 'utf-8');
for (const line of raw.split('\n')) {
  const stripped = line.trim();
  if (!stripped || stripped.startsWith('#')) continue;
  const eqIdx = stripped.indexOf('=');
  if (eqIdx === -1) continue;
  const key = stripped.slice(0, eqIdx).trim();
  let   val = stripped.slice(eqIdx + 1).trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const [,, username, password, name = 'Super Admin'] = process.argv;
if (!username || !password) {
  console.error('Usage: node scripts/create-superadmin.mjs <username> <password> [name]');
  process.exit(1);
}

const SHEET_ID = process.env.SUPERADMIN_SHEET_ID;
const TAB_NAME = 'SuperAdmins';
const HEADERS  = ['username', 'password', 'name', 'role', 'active', 'created_at'];

async function main() {
  if (!SHEET_ID) { console.error('❌  SUPERADMIN_SHEET_ID not set'); process.exit(1); }

  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const auth   = new google.auth.JWT(email, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });

  // Ensure tab exists
  const meta    = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabNames = meta.data.sheets.map((s) => s.properties.title);
  if (!tabNames.includes(TAB_NAME)) {
    console.log(`Creating "${TAB_NAME}" tab…`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody:   { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
    });
  }

  // Check headers
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A1:Z1`,
  });
  if (!existing.data.values?.[0]?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId:    SHEET_ID,
      range:            `${TAB_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody:      { values: [HEADERS] },
    });
    console.log('Headers written.');
  }

  // Check duplicate username
  const allRows = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });
  const usernames = (allRows.data.values || []).flat();
  if (usernames.includes(username)) {
    console.error(`❌  Username "${username}" already exists.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const row = [username, hashed, name, 'SuperAdmin', 'true', new Date().toISOString()];

  await sheets.spreadsheets.values.append({
    spreadsheetId:    SHEET_ID,
    range:            `${TAB_NAME}!A:F`,
    valueInputOption: 'RAW',
    requestBody:      { values: [row] },
  });

  console.log(`✅  SuperAdmin user "${username}" created successfully.`);
  console.log(`    Name:  ${name}`);
  console.log(`    Login: username="${username}", password="${password}"`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
