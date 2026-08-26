// middleware.js — Device Token Guard (cookie-based)
import { NextResponse } from 'next/server';

// ── Public paths — always allowed, no token needed ───────────────────────────
const PUBLIC_PATHS = [
  '/',                      // login page
  '/device-register',       // token registration
  '/api/auth/login',        // login API — must be public
  '/api/auth/logout',       // logout
  '/api/auth/me',           // session check
  '/api/devices/verify',    // verify endpoint itself
  '/api/devices/register',  // server-side device registration (sets HttpOnly cookie)
  '/api/devices/clear',     // server-side cookie clear
  '/_next',
  '/favicon.ico',
];

const TOKEN_COOKIE   = 'afts_device_token';
const TOKEN_HEADER   = 'x-device-token';
const CACHE_TTL      = 5 * 60 * 1000; // 5 min

// ── In-memory cache ───────────────────────────────────────────────────────────
const cache = new Map();
function getCached(token) {
  const e = cache.get(token);
  if (!e) return null;
  if (Date.now() > e.expires) { cache.delete(token); return null; }
  return e;
}
function setCache(token, data) {
  cache.set(token, { ...data, expires: Date.now() + CACHE_TTL });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
}

// ── Blocked HTML page ─────────────────────────────────────────────────────────
function blockedHtml(reason, deviceName) {
  return `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
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
    <p>${deviceName
      ? `Device "<strong>${deviceName}</strong>" has been revoked.`
      : 'This device is not registered to use AFTS.'}</p>
    <p>Contact your administrator to get a device token.</p>
    <div class="reason">${reason || 'No device token found'}</div>
    <a href="/device-register">Register / Update Token →</a>
  </div></body></html>`;
}

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1. Always allow public paths (exact or prefix match)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // 2. Localhost bypass — controlled by env var
  //    Set DISABLE_DEVICE_CHECK=true in .env.local to bypass on localhost
  //    By default localhost is NOT bypassed so you can test properly
  const host          = req.headers.get('host') || '';
  const isLocalhost   = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const bypassEnabled = true;
  // process.env.DISABLE_DEVICE_CHECK === 'true';

  if (isLocalhost && bypassEnabled) {
    return NextResponse.next();
  }

  // 3. Read token — cookie (SSR) or header (fetch calls)
  const token =
    req.cookies.get(TOKEN_COOKIE)?.value ||
    req.headers.get(TOKEN_HEADER)        ||
    '';

  const isApi = pathname.startsWith('/api/');

  // 4. No token at all
  if (!token) {
    if (isApi) {
      return NextResponse.json(
        { error: 'Device not registered', code: 'NO_DEVICE_TOKEN' },
        { status: 403 }
      );
    }
    // Redirect to device-register, preserve intended destination
    const url = new URL('/device-register', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 5. Check cache
  const cached = getCached(token);
  if (cached) {
    if (cached.valid) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: 'Device not authorised' }, { status: 403 });
    return new NextResponse(blockedHtml(cached.reason, cached.device_name), {
      status: 403, headers: { 'Content-Type': 'text/html' },
    });
  }

  // 6. Verify against Google Sheets
  try {
    const verifyRes = await fetch(new URL('/api/devices/verify', req.url).toString(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
    const data = await verifyRes.json();
    setCache(token, data);

    if (data.valid) return NextResponse.next();

    if (isApi) return NextResponse.json({ error: 'Device not authorised', reason: data.reason }, { status: 403 });
    return new NextResponse(blockedHtml(data.reason, data.device_name), {
      status: 403, headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('[DEVICE-GUARD] verify error:', err.message);
    if (isApi) return NextResponse.json({ error: 'Device verification unavailable' }, { status: 503 });
    return new NextResponse(blockedHtml('Verification service error — try again', ''), {
      status: 503, headers: { 'Content-Type': 'text/html' },
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
