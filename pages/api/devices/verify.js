// pages/api/devices/verify.js
// Called internally by middleware to validate a device token.
// Org resolution: middleware passes `?orgId=` in the request.
// Resolves org via lib/orgs (sheet-primary, env-fallback).

import { getOrgByIdAsync } from '../../../lib/orgs';

const SHEET_NAME = 'Devices';

// ── Get a Google OAuth2 access token from service account JWT ──
async function getAccessToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const now    = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim  = {
    iss:   email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  };

  // Base64url encode
  const b64 = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsigned = `${b64(header)}.${b64(claim)}`;

  // Import private key
  const keyData = privateKey
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${unsigned}.${sig64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ── Fetch Devices sheet rows ───────────────────────────────────
async function fetchDevices(accessToken, sheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_NAME)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

// ── Node.js handler ────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(200).json({ valid: false, reason: 'No token' });
    }

    // Resolve orgId — middleware sends it as a query parameter
    const orgId = req.query.orgId || null;
    const org   = await getOrgByIdAsync(orgId);
    if (!org || !org.sheetId) {
      return res.status(200).json({ valid: false, reason: 'Unknown organisation' });
    }

    const accessToken = await getAccessToken();
    const devices     = await fetchDevices(accessToken, org.sheetId);

    const device = devices.find((d) => d.token === token);

    if (!device) {
      return res.status(200).json({ valid: false, reason: 'Token not found' });
    }
    if (device.status !== 'active') {
      return res.status(200).json({ valid: false, reason: `Device ${device.status}`, device_name: device.device_name });
    }

    return res.status(200).json({ valid: true, device_name: device.device_name, device_description: device.device_description });
  } catch (err) {
    console.error('Device verify error:', err);
    // On error, FAIL OPEN only in dev — FAIL CLOSED in production
    const isDev = process.env.NODE_ENV === 'development';
    return res.status(200).json({ valid: isDev, reason: 'Verification service error', error: err.message });
  }
}