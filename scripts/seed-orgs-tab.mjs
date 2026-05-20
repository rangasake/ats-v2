#!/usr/bin/env node
/**
 * seed-orgs-tab.mjs
 * Initialises the "orgs" tab in the SuperAdmin Google Sheet and seeds
 * the two existing organisations (konaseema, krishna).
 *
 * Usage:
 *   node scripts/seed-orgs-tab.mjs
 *
 * Requires: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
 *           SUPERADMIN_SHEET_ID in .env.local
 */
import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { google }       from 'googleapis';

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
  // Strip surrounding single or double quotes
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const SHEET_ID  = process.env.SUPERADMIN_SHEET_ID;
const TAB_NAME  = 'orgs';
const HEADERS   = ['org_id','org_name','org_domain','org_sheetid','active_inactive',
                   'primary_color','accent_color','logo_text','subtitle','cert_prefix','created_at'];

const ORGS = [
  {
    org_id:          'konaseema',
    org_name:        'ATS Konaseema',
    org_domain:      'konaseema-ats.in',
    org_sheetid:     process.env.ORG_KONASEEMA_SHEET_ID || '',
    active_inactive: 'active',
    primary_color:   '#1e3a8a',
    accent_color:    '#2563eb',
    logo_text:       'ATS - Konaseema',
    subtitle:        'Vehicle Fitness Testing Station',
    cert_prefix:     'ATSK',
    created_at:      new Date().toISOString(),
  },
  {
    org_id:          'krishna',
    org_name:        'ATS Krishna',
    org_domain:      'krishna-ats.in',
    org_sheetid:     process.env.ORG_KRISHNA_SHEET_ID || '',
    active_inactive: 'active',
    primary_color:   '#065f46',
    accent_color:    '#059669',
    logo_text:       'ATS - Krishna',
    subtitle:        'Vehicle Fitness Testing Station',
    cert_prefix:     'ATSKR',
    created_at:      new Date().toISOString(),
  },
];

async function main() {
  if (!SHEET_ID) { console.error('❌  SUPERADMIN_SHEET_ID not set'); process.exit(1); }

  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !privateKey) { console.error('❌  Google service account credentials not set'); process.exit(1); }

  const auth = new google.auth.JWT(email, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });

  // ── Ensure "orgs" tab exists ──────────────────────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabNames = meta.data.sheets.map((s) => s.properties.title);
  if (!tabNames.includes(TAB_NAME)) {
    console.log(`Creating tab "${TAB_NAME}"…`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody:   { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
    });
  }

  // ── Check existing rows ───────────────────────────────────────────────────
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });
  const existingIds = (existing.data.values || []).flat();

  // Write headers if first row is empty
  if (!existingIds.length || existingIds[0] !== 'org_id') {
    console.log('Writing headers…');
    await sheets.spreadsheets.values.update({
      spreadsheetId:    SHEET_ID,
      range:            `${TAB_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody:      { values: [HEADERS] },
    });
  }

  // ── Append missing orgs ───────────────────────────────────────────────────
  let added = 0;
  for (const org of ORGS) {
    if (existingIds.includes(org.org_id)) {
      console.log(`⏭  "${org.org_id}" already exists — skipped`);
      continue;
    }
    const row = HEADERS.map((h) => org[h] ?? '');
    await sheets.spreadsheets.values.append({
      spreadsheetId:    SHEET_ID,
      range:            `${TAB_NAME}!A:K`,
      valueInputOption: 'RAW',
      requestBody:      { values: [row] },
    });
    console.log(`✅  Added "${org.org_id}" (${org.org_name})`);
    added++;
  }

  console.log(`\nDone. ${added} org(s) added to "${TAB_NAME}" tab in sheet ${SHEET_ID}.`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
