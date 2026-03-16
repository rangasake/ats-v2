import { useState, useEffect } from 'react';
import { useAuth } from '../lib/useAuth';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  }

  return (
    <>
      <Head>
            <link rel="icon" href="/favicon.ico" />
        <title>AFTS - Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-600 flex flex-col items-center justify-center px-4">
        {/* Logo / Header */}
        <div className="text-center text-white mb-8">
          <div className="text-5xl mb-3">🚗</div>
          <h1 className="text-2xl font-extrabold">AFTS Portal</h1>
          <p className="text-blue-200 text-sm mt-1">Automated Vehicle Fitness Testing Station</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome Back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPass ? '🙈' : '👁️'}
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
              className="btn-primary"
            >
              {submitting ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>
        </div>

        <p className="text-blue-200 text-xs mt-6 text-center">
          © {new Date().getFullYear()} AFTS Vehicle Fitness Testing Station
        </p>
      </div>
    </>
  );
}
