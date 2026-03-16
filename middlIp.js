// middleware.js  ← Place this in ROOT of project (same level as package.json)
// ─────────────────────────────────────────────────────────────────────────────
// Runs on EVERY request before it hits any page or API route.
// Blocks requests from IPs not in the whitelist.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

// ── Whitelisted IPs ───────────────────────────────────────────────────────────
// Add all allowed IP addresses here.
// Supports:
//   - IPv4 exact match:  "192.168.1.100"
//   - IPv6 exact match:  "::1"
//   - Comma-separated list via env var ALLOWED_IPS
// ─────────────────────────────────────────────────────────────────────────────
const HARDCODED_IPS = [
  '127.0.0.1',   // localhost IPv4
  '::1',         // localhost IPv6
  '::ffff:127.0.0.1', // localhost mapped IPv6
];

// Additional IPs from environment variable (comma separated)
// e.g. ALLOWED_IPS="203.0.113.10,203.0.113.20"
function getAllowedIPs() {
  const envIPs = (process.env.ALLOWED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  return [...new Set([...HARDCODED_IPS, ...envIPs])];
}

// ── Extract real client IP ────────────────────────────────────────────────────
// Handles proxies, Vercel, Nginx, Cloudflare etc.
function getClientIP(req) {
  // Vercel / Cloudflare / AWS sets this
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first (real client)
    return forwarded.split(',')[0].trim();
  }
  // Direct connection
  return req.headers.get('x-real-ip') || '::1';
}

// ── Blocked response page ─────────────────────────────────────────────────────
function blockedResponse(ip) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Access Denied — AFTS</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e3a8a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white;
          padding: 20px;
        }
        .card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          padding: 40px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .icon  { font-size: 56px; margin-bottom: 16px; }
        h1     { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
        p      { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.6; margin-bottom: 6px; }
        .ip    { font-size: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 6px 12px; display: inline-block; margin-top: 12px; font-family: monospace; letter-spacing: 0.05em; }
        .note  { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">🚫</div>
        <h1>Access Denied</h1>
        <p>This application is restricted to authorised devices and network locations only.</p>
        <p>Please contact your system administrator if you believe this is an error.</p>
        <div class="ip">Your IP: ${ip}</div>
        <p class="note">AFTS — Automated Vehicle Fitness Testing Station</p>
      </div>
    </body>
    </html>
  `;
  return new NextResponse(html, {
    status: 403,
    headers: { 'Content-Type': 'text/html' },
  });
}

// ── Middleware function ───────────────────────────────────────────────────────
export function middleware(req) {
  const clientIP    = getClientIP(req);
  const allowedIPs  = getAllowedIPs();
  const isAllowed   = allowedIPs.includes(clientIP);

  // Log every access attempt (visible in Vercel/server logs)
  const path    = req.nextUrl.pathname;
  const status  = isAllowed ? '✅ ALLOWED' : '🚫 BLOCKED';
  console.log(`[IP-GUARD] ${status} | IP: ${clientIP} | Path: ${path}`);

  if (!isAllowed) {
    return blockedResponse(clientIP);
  }

  return NextResponse.next();
}

// ── Which routes to protect ───────────────────────────────────────────────────
// Applies to ALL routes except Next.js internals and static files
export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};