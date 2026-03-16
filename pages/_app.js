import '../styles/globals.css';
import { AuthProvider } from '../lib/useAuth';
import { useEffect } from 'react';

// ── Patch global fetch to inject device token header on every request ─────────
// Token is stored in localStorage under key 'afts_device_token'
// Middleware reads header 'x-device-token' to validate the device
function patchFetch() {
  if (typeof window === 'undefined') return;
  const TOKEN_KEY    = 'afts_device_token';
  const TOKEN_HEADER = 'x-device-token';
  const _fetch       = window.fetch;

  window.fetch = function (input, init = {}) {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    if (token) {
      init.headers = {
        ...(init.headers || {}),
        [TOKEN_HEADER]: token,
      };
    }
    return _fetch(input, init);
  };
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    patchFetch();
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}