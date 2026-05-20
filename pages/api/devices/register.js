// pages/api/devices/register.js
// Validates a device token and sets an HttpOnly cookie server-side.
// Called by the device-register page instead of writing cookies from the browser.

import { getOrgByHost } from '../../../lib/orgs';

const TOKEN_COOKIE = 'afts_device_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ valid: false, reason: 'Token is required' });
  }

  const trimmed = token.trim();

  try {
    // Verify token against Devices sheet via the existing edge verify endpoint
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const org = getOrgByHost(host);
    const verifyUrl = new URL(`${protocol}://${host}/api/devices/verify`);
    if (org) verifyUrl.searchParams.set('orgId', org.id);
    const verifyRes = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: trimmed }),
    });

    const data = await verifyRes.json();

    if (!data.valid) {
      return res.status(200).json({ valid: false, reason: data.reason });
    }

    // Set the device token as an HttpOnly cookie (not accessible from JS)
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = isProduction ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      `${TOKEN_COOKIE}=${encodeURIComponent(trimmed)}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
    );

    return res.status(200).json({
      valid: true,
      device_name: data.device_name,
      device_description: data.device_description,
    });
  } catch (err) {
    console.error('Device register error:', err);
    return res.status(500).json({ valid: false, reason: 'Server error' });
  }
}
