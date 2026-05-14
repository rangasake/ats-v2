// pages/api/devices/clear.js
// Clears the device token HttpOnly cookie server-side.

const TOKEN_COOKIE = 'afts_device_token';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${TOKEN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`
  );
  return res.status(200).json({ success: true });
}
