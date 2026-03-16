// pages/api/devices/verify.js
// Called internally by middleware to validate a device token.
// Uses direct Google Sheets REST API (no googleapis SDK) because
// Next.js middleware runs on the Edge Runtime which does not support Node.js modules.

export const config = { runtime: 'edge' };

const SHEET_ID   = process.env.GOOGLE_SHEETS_ID;
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
async function fetchDevices(accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}`;
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

// ── Edge handler ───────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ valid: false, reason: 'No token' }), { status: 200 });
    }

    const accessToken = await getAccessToken();
    const devices     = await fetchDevices(accessToken);

    const device = devices.find((d) => d.token === token);

    if (!device) {
      return new Response(JSON.stringify({ valid: false, reason: 'Token not found' }), { status: 200 });
    }
    if (device.status !== 'active') {
      return new Response(JSON.stringify({ valid: false, reason: `Device ${device.status}`, device_name: device.device_name }), { status: 200 });
    }

    return new Response(
      JSON.stringify({ valid: true, device_name: device.device_name, device_description: device.device_description }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Device verify error:', err);
    // On error, FAIL OPEN only in dev — FAIL CLOSED in production
    const isDev = process.env.NODE_ENV === 'development';
    return new Response(
      JSON.stringify({ valid: isDev, reason: 'Verification service error', error: err.message }),
      { status: 200 }
    );
  }
}