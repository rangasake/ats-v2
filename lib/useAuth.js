import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiry, setSessionExpiry] = useState(null); // Unix ms timestamp
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, []);

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.exp) setSessionExpiry(data.user.exp * 1000);
      } else {
        setUser(null);
        setSessionExpiry(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      if (data.user?.exp) setSessionExpiry(data.user.exp * 1000);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error };
  }

  async function renewSession() {
    try {
      const res = await fetch('/api/auth/renew', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.exp) setSessionExpiry(data.exp * 1000);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe, sessionExpiry, renewSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function withAuth(Component, allowedRoles = []) {
  return function ProtectedComponent(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/');
      }
      if (!loading && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push('/dashboard');
      }
    }, [user, loading]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) return null;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;

    return <Component {...props} />;
  };
}
