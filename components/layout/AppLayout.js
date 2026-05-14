import { useAuth } from '../../lib/useAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ROLES } from '../../lib/constants';

const STATUS_COLORS = {
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
  Pending:  'bg-yellow-100 text-yellow-700',
  Draft:    'bg-gray-100 text-gray-500',
};

export default function AppLayout({ children, title }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen]       = useState(false);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds]   = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(sessionStorage.getItem('ats_notif_dismissed') || '[]'); } catch { return []; }
  });
  const [panelOpen, setPanelOpen]         = useState(false);
  const [popupOpen, setPopupOpen]         = useState(false);
  const [notifLoaded, setNotifLoaded]     = useState(false);

  // NOTE: dismissedIds is seeded from sessionStorage synchronously above — no extra useEffect needed.

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setNotifLoaded(true);
      })
      .catch(() => setNotifLoaded(true));
  }, [user?.username]);

  // Show popup once per session for unseen notifications
  useEffect(() => {
    if (!notifLoaded || notifications.length === 0) return;
    const stored = JSON.parse(sessionStorage.getItem('ats_notif_dismissed') || '[]');
    const unseen = notifications.filter((n) => !stored.includes(n.id));
    if (unseen.length > 0) setPopupOpen(true);
  }, [notifLoaded]);

  const unseenCount = notifications.filter((n) => !dismissedIds.includes(n.inspection_id)).length;

  function markAllSeen() {
    const allIds  = notifications.map((n) => n.id);
    const merged  = [...new Set([...dismissedIds, ...allIds])];
    sessionStorage.setItem('ats_notif_dismissed', JSON.stringify(merged));
    setDismissedIds(merged);
    setPopupOpen(false);
  }

  // ── Nav links ──────────────────────────────────────────────────────────────
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
      links.push({ href: '/admin/users',          label: '👥 Users' });
      links.push({ href: '/admin/staff',          label: '👷 Staff' });
      links.push({ href: '/admin/lane-config',    label: '⚙️ Lane Config' });
      links.push({ href: '/admin/devices',        label: '📱 Devices' });
      links.push({ href: '/admin/announcements',  label: '📢 Send Notifications' });
    }
    return links;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-40 no-print">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div>
            <div className="font-bold text-base leading-tight">🚗 ATS</div>
            <div className="text-xs text-blue-200 leading-tight">Vehicle Fitness Testing</div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="text-right hidden sm:block mr-1">
                <div className="text-xs text-blue-200">{user.role}</div>
                <div className="text-sm font-semibold">{user.name}</div>
              </div>
            )}

            {/* Bell icon — all logged-in users */}
            {user && (
              <button
                onClick={() => { setPanelOpen(!panelOpen); setMenuOpen(false); }}
                className="relative p-2 rounded-lg hover:bg-blue-600 transition-colors"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unseenCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 bg-red-500 text-white">
                    {unseenCount}
                  </span>
                )}
              </button>
            )}

            {/* Hamburger */}
            <button
              onClick={() => { setMenuOpen(!menuOpen); setPanelOpen(false); }}
              className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <div className="w-5 h-0.5 bg-white mb-1"></div>
              <div className="w-5 h-0.5 bg-white mb-1"></div>
              <div className="w-5 h-0.5 bg-white"></div>
            </button>
          </div>
        </div>

        {/* Hamburger Dropdown */}
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

        {/* Notification Panel Dropdown */}
        {panelOpen && (
          <div
            className="absolute right-4 top-14 bg-white rounded-2xl shadow-xl border border-gray-100 w-80 z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-indigo-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-indigo-800 text-sm">🔔 Notifications</span>
              <div className="flex items-center gap-2">
                {unseenCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAllSeen(); setPanelOpen(false); }}
                    className="text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded-lg"
                  >
                    ✓ Mark as read
                  </button>
                )}
                <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.map((n) => {
                  const isUnseen = !dismissedIds.includes(n.id);
                  if (n.type === 'announcement') {
                    return (
                      <div key={n.id} className={`px-4 py-3 ${isUnseen ? 'bg-amber-50/60' : ''}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">📢 {n.target_role === 'All' ? 'Everyone' : n.target_role}</span>
                          {isUnseen && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                        </div>
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          From <strong>{n.sent_by}</strong>
                          {n.created_at && <> · {new Date(n.created_at).toLocaleString()}</>}
                        </p>
                      </div>
                    );
                  }
                  // takeover
                  return (
                    <Link
                      key={n.id}
                      href={`/inspection/${n.inspection_id}`}
                      onClick={() => setPanelOpen(false)}
                    >
                      <div className={`px-4 py-3 hover:bg-gray-50 transition-colors ${isUnseen ? 'bg-indigo-50/40' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-gray-800 text-sm">{n.vehicle_number}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status] || 'bg-gray-100 text-gray-500'}`}>
                            {n.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Completed by <strong className="text-gray-700">{n.inspector_name}</strong>
                        </p>
                        {n.created_at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        )}
                        {isUnseen && <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mt-1" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Click outside to close menus */}
      {(menuOpen || panelOpen) && (
        <div className="fixed inset-0 z-30" onClick={() => { setMenuOpen(false); setPanelOpen(false); }} />
      )}

      {/* ── First-login notification popup ───────────────────────────────────── */}
      {popupOpen && notifications.length > 0 && (() => {
        const unseen       = notifications.filter((n) => !dismissedIds.includes(n.id));
        if (unseen.length === 0) return null;
        const hasAnn       = unseen.some((n) => n.type === 'announcement');
        const hasTakeover  = unseen.some((n) => n.type === 'takeover');
        const headingIcon  = hasAnn && !hasTakeover ? '📢' : '🔔';
        const headingText  = hasAnn && !hasTakeover
          ? 'New Announcement'
          : hasTakeover && !hasAnn
          ? 'Inspection Update'
          : 'New Notifications';
        const subText      = hasAnn && !hasTakeover
          ? `You have ${unseen.length > 1 ? 'new messages' : 'a new message'} from admin:`
          : hasTakeover && !hasAnn
          ? `The following vehicle${unseen.length > 1 ? 's' : ''} you started ${unseen.length > 1 ? 'were' : 'was'} continued by another inspector:`
          : 'You have new updates:';
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '1rem' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl">{headingIcon}</span>
                <span className="font-bold">{headingText}</span>
              </div>
              <button onClick={markAllSeen} className="text-indigo-200 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-3">{subText}</p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {unseen.map((n) => {
                  if (n.type === 'announcement') {
                    return (
                      <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            📢 {n.target_role === 'All' ? 'Everyone' : n.target_role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">From <strong>{n.sent_by}</strong></p>
                      </div>
                    );
                  }
                  return (
                    <Link key={n.id} href={`/inspection/${n.inspection_id}`} onClick={markAllSeen}>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{n.vehicle_number}</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            by <strong className="text-indigo-700">{n.inspector_name}</strong>
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status] || 'bg-gray-100 text-gray-500'}`}>
                          {n.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button onClick={markAllSeen} className="btn-primary">
                Got it ✓
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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
