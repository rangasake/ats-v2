// pages/device-register.js
// Token saved in BOTH cookie (for middleware SSR checks) and localStorage (backup)
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const TOKEN_KEY    = 'afts_device_token';
const COOKIE_NAME  = 'afts_device_token';
// Cookie max age: 1 year (in seconds)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setTokenCookie(token) {
  // SameSite=Lax works for same-origin; no Secure flag needed for http localhost
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearTokenCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export default function DeviceRegister() {
  const router  = useRouter();
  const [token, setToken]       = useState('');
  const [status, setStatus]     = useState('idle');
  const [message, setMessage]   = useState('');
  const [existing, setExisting] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY) || '';
    if (saved) setExisting(saved.slice(0, 10) + '••••••••••••••');
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;

    setStatus('checking');
    setMessage('');

    try {
      const res  = await fetch('/api/devices/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: trimmed }),
      });
      const data = await res.json();

      if (data.valid) {
        // Save to BOTH cookie and localStorage
        setTokenCookie(trimmed);
        localStorage.setItem(TOKEN_KEY, trimmed);

        setStatus('success');
        setMessage(`✅ Device "${data.device_name}" registered! Redirecting...`);
        setTimeout(() => router.push('/'), 1500);
      } else {
        setStatus('error');
        setMessage(`❌ ${data.reason || 'Invalid or revoked token'}. Contact your admin.`);
      }
    } catch {
      setStatus('error');
      setMessage('⚠️ Could not verify token. Check your internet connection.');
    }
  }

  function handleClear() {
    clearTokenCookie();
    localStorage.removeItem(TOKEN_KEY);
    setExisting('');
    setToken('');
    setStatus('idle');
    setMessage('Token cleared. Enter a new token below.');
  }

  return (
    <>
      <Head>
        <title>Register Device — AFTS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col items-center justify-center px-4">
        <div className="text-center text-white mb-8">
          <div className="text-5xl mb-3">📱</div>
          <h1 className="text-2xl font-extrabold">Register This Device</h1>
          <p className="text-blue-200 text-sm mt-1">AFTS — Vehicle Fitness Testing Station</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
          {existing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-800">
              <div className="font-semibold mb-1">⚠️ Token already saved</div>
              <div className="font-mono text-xs break-all">{existing}</div>
              <button onClick={handleClear} className="mt-2 text-xs text-red-600 underline">
                Clear &amp; enter new token
              </button>
            </div>
          )}

          <h2 className="text-lg font-bold text-gray-800 mb-1">Enter Device Token</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ask your administrator for the token assigned to this device. You only need to do this once.
          </p>

          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Device Token</label>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="AFTS-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            {message && (
              <div className={`text-sm rounded-xl px-4 py-3 mb-4
                ${status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                ${status === 'error'   ? 'bg-red-50 text-red-700 border border-red-200'     : ''}
                ${status === 'idle'    ? 'bg-blue-50 text-blue-700 border border-blue-200'  : ''}
              `}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'checking' || !token.trim()}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 active:scale-95 transition-all"
            >
              {status === 'checking' ? '⏳ Verifying...' : '🔐 Register Device'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-blue-200 text-xs text-center max-w-xs">
          Token is stored as a secure cookie on this device only.
        </p>
      </div>
    </>
  );
}