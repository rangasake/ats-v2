// lib/orgs.js — Organisation registry and resolution
// ─────────────────────────────────────────────────────────────────────────────
// Primary source of truth: SuperAdmin sheet "orgs" tab (live, supports UI management)
// Fallback: ORG_CONFIGS env var (for middleware Edge Runtime & backward compat)
// ─────────────────────────────────────────────────────────────────────────────

import { google } from 'googleapis';

// ─── Env-var fallback (used by middleware + as seed) ─────────────────────────

let _parsed = null;
function getOrgConfigs() {
  if (_parsed) return _parsed;
  try {
    _parsed = JSON.parse(process.env.ORG_CONFIGS || '[]');
  } catch {
    _parsed = [];
  }
  return _parsed;
}

function getSuperAdminOrg() {
  return {
    id:           '__super__',
    name:         'AFTS Super Admin',
    domain:       process.env.SUPERADMIN_DOMAIN || '',
    sheetIdKey:   'SUPERADMIN_SHEET_ID',
    primaryColor: '#1e1b4b',
    accentColor:  '#4f46e5',
    logoText:     'AFTS Admin',
    subtitle:     'Multi-Organisation Management',
    certPrefix:   '',
  };
}

// ─── Resolve org from the HTTP Host header ────────────────────────────────────
export function getOrgByHost(host = '') {
  const hostname = (host || '').split(':')[0].toLowerCase();

  // Local dev override: set ORG_DEV_ID=konaseema in .env.local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const devId = process.env.ORG_DEV_ID;
    if (devId === '__super__') return getSuperAdminOrg();
    if (devId) return getOrgConfigs().find((o) => o.id === devId) || null;
    // Default to first configured org if no ORG_DEV_ID set
    return getOrgConfigs()[0] || null;
  }

  // SuperAdmin domain
  const saDomain = (process.env.SUPERADMIN_DOMAIN || '').toLowerCase();
  if (saDomain && hostname === saDomain) return getSuperAdminOrg();

  return getOrgConfigs().find((o) => o.domain === hostname) || null;
}

export function getOrgById(id) {
  if (id === '__super__') return getSuperAdminOrg();
  return getOrgConfigs().find((o) => o.id === id) || null;
}

export function getAllOrgs() {
  return getOrgConfigs();
}

// ─── Get Google Sheet ID for an org — NEVER exposed to the client ─────────────
export function getSheetIdForOrg(orgId) {
  const org = getOrgById(orgId);
  if (!org) throw new Error(`Unknown org: ${orgId}`);
  const sheetId = process.env[org.sheetIdKey];
  if (!sheetId) throw new Error(`Env var "${org.sheetIdKey}" not set for org: ${orgId}`);
  return sheetId;
}

// ─── Certificate ID prefix per org ───────────────────────────────────────────
export function getCertPrefix(orgId) {
  const org = getOrgById(orgId);
  return org?.certPrefix || 'ATS';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET-BASED ORG REGISTRY (async, primary source of truth)
// All org configs are stored in the SuperAdmin sheet "orgs" tab.
// This allows adding/managing orgs from the SuperAdmin UI without redeployment.
// ═══════════════════════════════════════════════════════════════════════════════

let _sheetOrgsCache = null;   // raw row objects from sheet
let _sheetOrgsCacheTs = 0;
let _cacheRefreshing  = false;
const ORGS_SHEET_CACHE_TTL = 5 * 60 * 1000; // 5 min

function _getOrgSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

async function _loadOrgsFromSheet() {
  const sheetId = process.env.SUPERADMIN_SHEET_ID;
  if (!sheetId) return null; // sheet not configured — use env var only

  const sheets = _getOrgSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'orgs!A:Z',
  });
  const raw = res.data.values || [];
  if (raw.length < 2) return [];
  const headers = raw[0];
  return raw.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  }).filter((r) => r.org_id);
}

async function _ensureOrgsCache(force = false) {
  if (!force && _sheetOrgsCache !== null && (Date.now() - _sheetOrgsCacheTs) < ORGS_SHEET_CACHE_TTL) return;
  if (_cacheRefreshing) return;
  _cacheRefreshing = true;
  try {
    const rows = await _loadOrgsFromSheet();
    if (rows !== null) { _sheetOrgsCache = rows; _sheetOrgsCacheTs = Date.now(); }
  } catch (e) {
    console.error('[orgs] cache refresh failed:', e.message);
  } finally { _cacheRefreshing = false; }
}

export function invalidateOrgsCache() { _sheetOrgsCache = null; _sheetOrgsCacheTs = 0; }

function _parseOrgRow(row) {
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

export async function getAllOrgsAsync() {
  await _ensureOrgsCache();
  const sheetOrgs = (_sheetOrgsCache || []).map(_parseOrgRow);
  // Merge with env-var orgs not yet in sheet (backward compat)
  const sheetIds = new Set(sheetOrgs.map((o) => o.id));
  const envOnly  = getOrgConfigs().filter((o) => !sheetIds.has(o.id));
  return [...sheetOrgs, ...envOnly];
}

export async function getOrgByHostAsync(host = '') {
  const hostname = (host || '').split(':')[0].toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const devId = process.env.ORG_DEV_ID;
    if (devId === '__super__') return getSuperAdminOrg();
    await _ensureOrgsCache();
    if (devId) {
      const row = _sheetOrgsCache?.find((r) => r.org_id === devId);
      if (row) return _parseOrgRow(row);
    }
    return getOrgByHost(host); // env var fallback
  }
  const saDomain = (process.env.SUPERADMIN_DOMAIN || '').toLowerCase();
  if (saDomain && hostname === saDomain) return getSuperAdminOrg();
  await _ensureOrgsCache();
  const row = _sheetOrgsCache?.find((r) => r.org_domain === hostname && r.active_inactive === 'active');
  return row ? _parseOrgRow(row) : getOrgByHost(host);
}

export async function getOrgByIdAsync(id) {
  if (id === '__super__') return getSuperAdminOrg();
  await _ensureOrgsCache();
  const row = _sheetOrgsCache?.find((r) => r.org_id === id);
  return row ? _parseOrgRow(row) : getOrgById(id);
}

// Used by lib/googleSheets.js (replaces sync getSheetIdForOrg)
export async function getSheetIdForOrgAsync(orgId) {
  if (orgId === '__super__') {
    const id = process.env.SUPERADMIN_SHEET_ID;
    if (!id) throw new Error('SUPERADMIN_SHEET_ID env var not set');
    return id;
  }
  await _ensureOrgsCache();
  const row = _sheetOrgsCache?.find((r) => r.org_id === orgId);
  if (row?.org_sheetid) return row.org_sheetid;
  // Fallback: env var (for orgs not yet in sheet)
  const envOrg = getOrgConfigs().find((o) => o.id === orgId);
  if (envOrg) { const id = process.env[envOrg.sheetIdKey]; if (id) return id; }
  throw new Error(`No sheet ID configured for org: ${orgId}`);
}

// Expose sheets client for SuperAdmin API routes to write orgs
export function getOrgSheetsClient() { return _getOrgSheetsClient(); }
