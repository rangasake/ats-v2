import { useState, useEffect } from 'react';
import { useAuth } from '../lib/useAuth';
import { useOrg } from '../lib/OrgContext';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const org = useOrg();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === 'SuperAdmin' ? '/superadmin' : '/dashboard');
    }
  }, [user, loading]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);
    if (result.success) {
      router.push(result.user?.role === 'SuperAdmin' ? '/superadmin' : '/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  }

  return (
    <>
      <Head>
            <link rel="icon" href="/favicon.ico" />
        <title>{`${org?.logoText || 'AFTS'} - Login`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Full-screen deep-blue to dark-navy background */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 85%, black) 40%, color-mix(in srgb, var(--color-primary) 60%, black) 100%)' }}
      >
        {/* Subtle decorative rings */}
        <div className="absolute top-[-120px] left-[-120px] w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />

        {/* Logo / Header */}
        <div className="text-center text-white mb-8 relative z-10">
          {/* SVG badge icon instead of emoji */}
          {/* <div className="mx-auto mb-4 w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div> */}
          <h1 className="text-3xl font-extrabold tracking-tight">{org?.logoText || 'AFTS'}</h1>
          <p className="text-blue-300 text-sm mt-1 font-medium">{org?.subtitle || 'Vehicle Fitness Testing Station'}</p>
        </div>

        {/* Card */}
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-0.5">Welcome Back</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to continue</p>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Enter username"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>

            <div className="mb-5">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-12"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3 px-6 rounded-xl font-bold text-white text-base active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}
            >
              {submitting ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p className="relative z-10 text-blue-400 text-xs mt-6 text-center">
          © {new Date().getFullYear()} {org?.name || 'Vehicle Fitness Testing Station'}
        </p>
      </div>
    </>
  );
}
