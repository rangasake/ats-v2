import '../styles/globals.css';
import { AuthProvider } from '../lib/useAuth';
import { useEffect } from 'react';

const TOKEN_KEY   = 'afts_device_token';
const TOKEN_HEADER = 'x-device-token';
const COOKIE_NAME  = 'afts_device_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Ensure token is always in cookie (in case it was only in localStorage)
function syncTokenToCookie() {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  // Only set if cookie is missing
  if (!document.cookie.includes(COOKIE_NAME + '=')) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

// Patch fetch to also inject token as header (for API routes that check header)
function patchFetch() {
  if (typeof window === 'undefined') return;
  const _fetch = window.fetch;
  window.fetch = function (input, init = {}) {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    if (token) {
      init.headers = { ...(init.headers || {}), [TOKEN_HEADER]: token };
    }
    return _fetch(input, init);
  };
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    syncTokenToCookie();
    patchFetch();
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}