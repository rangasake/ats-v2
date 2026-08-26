import { useAuth } from '../../lib/useAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ROLES } from '../../lib/constants';
import { useSelector } from 'react-redux';


const WARNING_MS = 10 * 60 * 1000; // warn 10 min before expiry

const STATUS_COLORS = {
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
  Pending:  'bg-yellow-100 text-yellow-700',
  Draft:    'bg-gray-100 text-gray-500',
};

export default function AppLayout({ children, title }) {
  const org = useSelector((state) => state.org.org);
  const { user, logout, sessionExpiry, renewSession } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen]             = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [minsLeft, setMinsLeft]             = useState(0);
  const [renewing, setRenewing]             = useState(false);

  // ── Session expiry countdown ───────────────────────────────────────────────
  useEffect(() => {
    if (!sessionExpiry) return;
    const tick = () => {
      const remaining = sessionExpiry - Date.now();
      if (remaining <= 0) { setSessionWarning(false); return; }
      if (remaining <= WARNING_MS) {
        setMinsLeft(Math.ceil(remaining / 60000));
        setSessionWarning(true);
      } else {
        setSessionWarning(false);
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [sessionExpiry]);

  async function handleRenew() {
    setRenewing(true);
    const ok = await renewSession();
    setRenewing(false);
    if (ok) setSessionWarning(false);
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds]   = useState([]);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [popupOpen, setPopupOpen]         = useState(false);
  const [notifLoaded, setNotifLoaded]     = useState(false);

  // Re-seed dismissed IDs whenever the logged-in user changes
  useEffect(() => {
    if (!user) return;
    try {
      const key = `ats_notif_dismissed_${user.username}`;
      const stored = JSON.parse(sessionStorage.getItem(key) || '[]');
      setDismissedIds(stored);
    } catch { setDismissedIds([]); }
    setNotifLoaded(false);
  }, [user?.username]);

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
    if (!notifLoaded || notifications.length === 0 || !user) return;
    const key = `ats_notif_dismissed_${user.username}`;
    const stored = JSON.parse(sessionStorage.getItem(key) || '[]');
    const unseen = notifications.filter((n) => !stored.includes(n.id));
    if (unseen.length > 0) setPopupOpen(true);
  }, [notifLoaded, user?.username]);

  const unseenCount = notifications.filter((n) => !dismissedIds.includes(n.id)).length;

  function markAllSeen() {
    const allIds  = notifications.map((n) => n.id);
    const merged  = [...new Set([...dismissedIds, ...allIds])];
    if (user) sessionStorage.setItem(`ats_notif_dismissed_${user.username}`, JSON.stringify(merged));
    setDismissedIds(merged);
    setPopupOpen(false);
  }

  // Hide bottom nav on scroll down, reveal on scroll up
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8)       setNavHidden(true);   // scrolling down
      else if (y < lastY - 8)  setNavHidden(false);  // scrolling up
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Also reveal nav when route changes (navigated to new page)
  useEffect(() => { setNavHidden(false); }, [router.pathname]);

  // ── Bottom nav tabs (role-specific, max 4 items) ──────────────────────────────────────────────────
  const bottomTabs = () => {
    if (!user) return [];
    const tabs = [{ href: '/dashboard', icon: '🏠', label: 'Home' }];
    if (user.role === ROLES.INSPECTOR || user.role === ROLES.ADMIN)
      tabs.push({ href: '/inspection/new', icon: '➕', label: 'New' });
    if (user.role === ROLES.SUPERVISOR || user.role === ROLES.ADMIN)
      tabs.push({ href: '/supervisor', icon: '📋', label: 'Queue' });
    if (user.role === ROLES.ADMIN)
      tabs.push({ href: '/admin/reports', icon: '📊', label: 'Reports' });
    return tabs;
  };

  // ── Nav links ──────────────────────────────────────────────────────────────────
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
      links.push({ href: '/admin/reports',        label: '📊 Reports' });
      links.push({ href: '/admin/audit',          label: '🗒️ Audit Log' });
    }
    return links;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <nav className="text-white shadow-lg sticky top-0 z-40 no-print" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e2d72)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div>
            <div className="font-bold text-base leading-tight">ATS - {org?.title}</div>
            <div className="text-xs text-blue-200 leading-tight">Vehicle Fitness Testing</div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="text-right hidden sm:block mr-1">
                <div className="text-sm font-semibold">{user.name}</div>
                                <div className="text-xs lowercase text-blue-200">{user.role}</div>
              </div>
            )}

            {/* Bell icon — all logged-in users */}
            {user && (
              <button
                onClick={() => { setPanelOpen(!panelOpen); setMenuOpen(false); }}
                className="relative p-2 rounded-lg hover:bg-blue-900 transition-colors"
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
              className="p-2 rounded-lg hover:bg-blue-900 transition-colors"
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
              <div className="px-4 py-3 bg-blue-900 border-b border-gray-100">
                <div className="font-semibold text-white">{user.name}</div>
                <div className="text-xs text-blue-200 font-medium">{user.role}</div>
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
            <div className="px-4 py-3 bg-blue-900 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-white text-sm">🔔 Notifications</span>
              <div className="flex items-center gap-2">
                {unseenCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAllSeen(); setPanelOpen(false); }}
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded-lg"
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
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e2d72)' }} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl">{headingIcon}</span>
                <span className="font-bold">{headingText}</span>
              </div>
              <button onClick={markAllSeen} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
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
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{n.vehicle_number}</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            by <strong className="text-blue-800">{n.inspector_name}</strong>
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

      {/* Session expiry warning banner */}
      {sessionWarning && (
        <div className="bg-orange-500 text-white text-sm px-4 py-2 flex items-center justify-between gap-3 no-print">
          <span>⏰ Session expires in <strong>{minsLeft} min</strong> — save your work!</span>
          <button
            onClick={handleRenew}
            disabled={renewing}
            className="shrink-0 bg-white text-orange-600 font-bold text-xs px-3 py-1 rounded-lg active:scale-95 disabled:opacity-60"
          >
            {renewing ? 'Renewing...' : 'Stay Logged In'}
          </button>
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {title && (
          <div className="mb-4">
            <h1 className="page-title">{title}</h1>
          </div>
        )}
        {children}
      </main>

      {/* Bottom navigation bar — hides on scroll down, reveals on scroll up */}
      {user && (
        <nav className={`fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 no-print transition-transform duration-300 ${
          navHidden ? 'translate-y-full' : 'translate-y-0'
        }`}>
          <div className="max-w-2xl mx-auto flex items-stretch">
            {bottomTabs().map((tab) => {
              const active = router.pathname === tab.href || router.pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition-colors
                    ${ active ? 'text-blue-800 bg-blue-50' : 'text-gray-400 active:bg-gray-50' }`}
                >
                  <span className="text-xl leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {active && <span className="absolute bottom-0 w-8 h-0.5 bg-blue-800 rounded-t-full" />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
