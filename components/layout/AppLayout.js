import { useAuth } from '../../lib/useAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';
import { ROLES } from '../../lib/constants';

export default function AppLayout({ children, title }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = () => {
    if (!user) return [];
    const links = [{ href: '/dashboard', label: '🏠 Dashboard' }];

    if (user.role === ROLES.INSPECTOR || user.role === ROLES.ADMIN) {
      links.push({ href: '/inspection/new', label: '➕ New Inspection' });
    }
    if (user.role === ROLES.SUPERVISOR || user.role === ROLES.ADMIN) {
      links.push({ href: '/supervisor', label: '📋 Review Queue' });
    }
    if (user.role === ROLES.ADMIN) {
      links.push({ href: '/admin/users', label: '👥 Users' });
      links.push({ href: '/admin/staff', label: '👷 Staff' });
      links.push({ href: '/admin/lane-config', label: '⚙️ Lane Config' });
      links.push({ href: '/admin/devices', label: '📱 Devices' });
    }
    return links;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-40 no-print">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-base leading-tight">🚗 ATS</div>
            <div className="text-xs text-blue-200 leading-tight">Vehicle Fitness Testing</div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right hidden sm:block">
                <div className="text-xs text-blue-200">{user.role}</div>
                <div className="text-sm font-semibold">{user.name}</div>
              </div>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <div className="w-5 h-0.5 bg-white mb-1"></div>
              <div className="w-5 h-0.5 bg-white mb-1"></div>
              <div className="w-5 h-0.5 bg-white"></div>
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-4 top-14 bg-white rounded-2xl shadow-xl border border-gray-100 w-56 z-50 overflow-hidden">
            {user && (
              <div className="px-4 py-3 bg-blue-50 border-b border-gray-100">
                <div className="font-semibold text-gray-800">{user.name}</div>
                <div className="text-xs text-blue-600 font-medium">{user.role}</div>
              </div>
            )}
            {navLinks().map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium"
            >
              🚪 Logout
            </button>
          </div>
        )}
      </nav>

      {/* Click outside to close */}
      {menuOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
      )}

      {/* Page Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {title && (
          <div className="mb-4">
            <h1 className="page-title">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}