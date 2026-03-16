// middleware.js  ← ROOT of project (same level as package.json)
// ─────────────────────────────────────────────────────────────────────────────
// Device Token Guard
// Every request must carry a valid device token stored in localStorage.
// The client-side _app.js injects it into every fetch via a custom header.
// Middleware reads the header and calls /api/devices/verify to validate it.
//
// Flow:
//   Device opens app → no token → redirected to /device-register
//   Admin creates token in /admin/devices → gives token string to device user
//   User pastes token once → stored in localStorage forever
//   Every subsequent request passes automatically
//   Admin can revoke/regenerate anytime from Google Sheets or /admin/devices
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

// ── Paths that are always public (no token needed) ───────────────────────────
const PUBLIC_PATHS = [
  '/device-register',          // token registration page
  '/api/devices/verify',       // verify endpoint itself
  '/_next',                    // Next.js internals
  '/favicon.ico',
];

// ── Token header name (must match what _app.js sends) ────────────────────────
const TOKEN_HEADER = 'x-device-token';

// ── In-memory cache: token → { valid, device_name, expires } ─────────────────
// Avoids hitting Google Sheets on every single request.
// Cache TTL: 5 minutes. On revoke the worst case is 5 min delay.
const cache      = new Map();
const CACHE_TTL  = 5 * 60 * 1000; // 5 minutes

function getCached(token) {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(token); return null; }
  return entry;
}

function setCache(token, data) {
  cache.set(token, { ...data, expires: Date.now() + CACHE_TTL });
  // Prevent unbounded memory — evict oldest when > 200 entries
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// ── HTML pages ───────────────────────────────────────────────────────────────
function blockedHtml(reason, deviceName) {
  return `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Access Denied — AFTS</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{min-height:100vh;display:flex;align-items:center;justify-content:center;
           background:#1e3a8a;font-family:-apple-system,sans-serif;color:#fff;padding:20px}
      .card{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
            border-radius:20px;padding:36px 28px;max-width:400px;width:100%;text-align:center}
      .icon{font-size:52px;margin-bottom:14px}
      h1{font-size:20px;font-weight:800;margin-bottom:8px}
      p{font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:6px}
      .reason{font-size:12px;background:rgba(0,0,0,0.3);border-radius:8px;
              padding:6px 12px;display:inline-block;margin-top:10px;font-family:monospace}
      a{color:#93c5fd;font-size:13px;display:block;margin-top:16px}
    </style>
  </head><body><div class="card">
    <div class="icon">🚫</div>
    <h1>Device Not Authorised</h1>
    <p>${deviceName ? `Device "<strong>${deviceName}</strong>" has been revoked.` : 'This device is not registered to use AFTS.'}</p>
    <p>Contact your administrator to get a new device token.</p>
    <div class="reason">${reason}</div>
    <a href="/device-register">Register / Update Token →</a>
  </div></body></html>`;
}

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.headers.get(TOKEN_HEADER) || '';

  // No token at all → redirect to register page (only for page requests)
  if (!token) {
    const isApiRoute = pathname.startsWith('/api/');
    if (isApiRoute) {
      return NextResponse.json({ error: 'Device not registered', code: 'NO_DEVICE_TOKEN' }, { status: 403 });
    }
    const registerUrl = new URL('/device-register', req.url);
    return NextResponse.redirect(registerUrl);
  }

  // Check cache first
  const cached = getCached(token);
  if (cached) {
    if (cached.valid) return NextResponse.next();
    return new NextResponse(blockedHtml(cached.reason, cached.device_name), {
      status: 403, headers: { 'Content-Type': 'text/html' },
    });
  }

  // Verify against Google Sheets via internal API
  try {
    const verifyUrl = new URL('/api/devices/verify', req.url);
    const verifyRes = await fetch(verifyUrl.toString(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
    const data = await verifyRes.json();

    setCache(token, data);

    if (data.valid) {
      // Pass device name downstream via header (readable in API routes via req.headers)
      const res = NextResponse.next();
      res.headers.set('x-device-name', data.device_name || '');
      return res;
    }

    const isApiRoute = pathname.startsWith('/api/');
    if (isApiRoute) {
      return NextResponse.json({ error: 'Device not authorised', reason: data.reason }, { status: 403 });
    }
    return new NextResponse(blockedHtml(data.reason, data.device_name), {
      status: 403, headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    // If verification service is down, fail open in dev, closed in prod
    console.error('[DEVICE-GUARD] verify failed:', err.message);
    if (process.env.NODE_ENV === 'development') return NextResponse.next();
    return new NextResponse(blockedHtml('Verification service unavailable', ''), {
      status: 503, headers: { 'Content-Type': 'text/html' },
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};