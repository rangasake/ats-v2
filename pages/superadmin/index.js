import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useAuth, withAuth } from '../../lib/useAuth';

// ── Colour swatch ─────────────────────────────────────────────────────────────
function ColorInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value, warn }) {
  return (
    <div className="bg-gray-50 rounded-xl py-2 text-center">
      <div className={`text-lg font-bold ${warn ? 'text-amber-600' : 'text-gray-700'}`}>{value ?? '—'}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

// ── Add / Edit Org Modal ──────────────────────────────────────────────────────
function OrgModal({ org, onClose, onSaved }) {
  const isEdit = !!org?.id;
  const [form, setForm] = useState({
    org_id:        org?.id           || '',
    org_name:      org?.name         || '',
    org_domain:    org?.domain       || '',
    org_sheetid:   org?.sheetId      || '',
    primary_color: org?.primaryColor || '#1e3a8a',
    accent_color:  org?.accentColor  || '#2563eb',
    logo_text:     org?.logoText     || '',
    subtitle:      org?.subtitle     || 'Vehicle Fitness Testing Station',
    cert_prefix:   org?.certPrefix   || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === 'string' ? v : v.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const body   = isEdit ? { org_id: org.id, ...form } : form;
      const r = await fetch('/api/superadmin/orgs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Save failed'); return; }
      onSaved();
    } catch { setError('Network error'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
          <h2 className="text-white font-bold text-base">{isEdit ? `Edit — ${org.name}` : 'Add New Organisation'}</h2>
          <button onClick={onClose} className="text-indigo-300 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className={isEdit ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">Org ID <span className="text-gray-400">(slug, lowercase)</span></label>
              <input required disabled={isEdit} value={form.org_id} onChange={set('org_id')}
                placeholder="konaseema" pattern="[a-z0-9_-]+"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cert Prefix</label>
                <input value={form.cert_prefix} onChange={set('cert_prefix')} placeholder="ATSK"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Organisation Name</label>
            <input required value={form.org_name} onChange={set('org_name')} placeholder="ATS Konaseema"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
            <input required value={form.org_domain} onChange={set('org_domain')} placeholder="konaseema-ats.in"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Google Sheet ID</label>
            <input required value={form.org_sheetid} onChange={set('org_sheetid')}
              placeholder="1peV1YKBrZBpPzOHK..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs" />
            <p className="text-xs text-gray-400 mt-1">
              Share the sheet with <code className="bg-gray-100 px-1 rounded">{'{'}service-account email{'}'}</code> as Editor first.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Logo Text</label>
            <input value={form.logo_text} onChange={set('logo_text')} placeholder="ATS - Konaseema"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
            <input value={form.subtitle} onChange={set('subtitle')} placeholder="Vehicle Fitness Testing Station"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorInput label="Primary Colour" value={form.primary_color} onChange={set('primary_color')} />
            <ColorInput label="Accent Colour"  value={form.accent_color}  onChange={set('accent_color')} />
          </div>

          {/* Preview strip */}
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <div className="h-8 flex items-center px-3 gap-2"
              style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }}>
              <span className="text-white text-xs font-bold">{form.logo_text || form.org_name || 'Preview'}</span>
              <span className="text-white/60 text-xs">{form.subtitle}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Organisation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Org Card ─────────────────────────────────────────────────────────────────
function OrgCard({ org, onEdit, onToggle, onSetup }) {
  const [toggling,    setToggling]    = useState(false);
  const [switching,   setSwitching]   = useState(false);
  const [switchError, setSwitchError] = useState('');

  async function handleToggle() {
    setToggling(true);
    await onToggle(org.id, !org.active);
    setToggling(false);
  }

  async function handleSwitch() {
    setSwitching(true); setSwitchError('');
    try {
      const r = await fetch('/api/superadmin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id }),
      });
      const data = await r.json();
      if (!r.ok) { setSwitchError(data.error || 'Failed'); setSwitching(false); return; }
      // Redirect to /api/auth/impersonate which sets the cookie and sends to /dashboard
      window.location.href = `/api/auth/impersonate?token=${encodeURIComponent(data.token)}`;
    } catch { setSwitchError('Network error'); setSwitching(false); }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-opacity ${org.active ? 'border-gray-100' : 'border-gray-200 opacity-70'}`}>
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${org.primaryColor}, ${org.accentColor})` }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: org.primaryColor }}>
              {org.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm leading-tight">{org.name}</div>
              <div className="text-xs text-gray-400">{org.domain}</div>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {org.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {org.error ? (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">⚠ {org.error}</div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <Stat label="Inspections" value={org.stats?.totalInspections} />
            <Stat label="Pending"     value={org.stats?.pendingReview} warn={org.stats?.pendingReview > 0} />
            <Stat label="Users"       value={org.stats?.activeUsers} />
          </div>
        )}

        {switchError && (
          <div className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 mb-2">{switchError}</div>
        )}

        {/* Switch to Org — full-width prominent button */}
        {org.active && (
          <button onClick={handleSwitch} disabled={switching}
            className="w-full mb-2 text-sm font-semibold text-white rounded-xl py-2 disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(135deg, ${org.primaryColor}, ${org.accentColor})` }}>
            {switching ? '⏳ Switching…' : `↗ Switch to ${org.name}`}
          </button>
        )}

        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => onEdit(org)}
            className="flex-1 min-w-[60px] text-xs border border-gray-300 text-gray-600 rounded-lg py-1.5 hover:bg-gray-50">
            ✏️ Edit
          </button>
          {!org.sheetId && (
            <button onClick={() => onSetup(org)}
              className="flex-1 min-w-[60px] text-xs bg-amber-50 border border-amber-300 text-amber-700 rounded-lg py-1.5 hover:bg-amber-100">
              🔧 Setup
            </button>
          )}
          <a href={`https://${org.domain}/`} target="_blank" rel="noreferrer"
            className="flex-1 min-w-[60px] text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg py-1.5 text-center hover:bg-indigo-100">
            🔗 Open
          </a>
          <button onClick={handleToggle} disabled={toggling}
            className={`flex-1 min-w-[60px] text-xs rounded-lg py-1.5 border disabled:opacity-50 ${
              org.active
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            }`}>
            {toggling ? '…' : org.active ? '⏸ Disable' : '▶ Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ORG_CONFIGS generator ─────────────────────────────────────────────────────
function OrgConfigsPanel({ orgs }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(
    orgs.filter((o) => o.active && o.sheetId).map((o) => ({
      id:          o.id,
      name:        o.name,
      domain:      o.domain,
      sheetIdKey:  `ORG_${o.id.toUpperCase()}_SHEET_ID`,
      primaryColor:o.primaryColor,
      accentColor: o.accentColor,
      logoText:    o.logoText,
      subtitle:    o.subtitle,
      certPrefix:  o.certPrefix,
    }))
  );

  function copy() {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-700">Vercel ENV — ORG_CONFIGS</h3>
          <p className="text-xs text-gray-400">Add this to your Vercel environment variables (wrap in single quotes)</p>
        </div>
        <button onClick={copy}
          className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50">
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      </div>
      <pre className="text-xs bg-gray-50 rounded-xl p-3 overflow-x-auto text-gray-600 border border-gray-200 whitespace-pre-wrap break-all">
        {json}
      </pre>
      <p className="text-xs text-amber-600 mt-2">
        ⚠ Also add <code className="bg-gray-100 px-1 rounded">ORG_{'<ID>'}_SHEET_ID</code> for each new org, then redeploy for middleware routing.
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(null); // null | 'add' | { edit: org } | { setup: org }
  const [showConfig, setShowConfig] = useState(false);
  const [toast, setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadOrgs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/superadmin/orgs');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setOrgs(d.orgs || []);
    } catch (e) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  async function handleToggle(orgId, newActive) {
    await fetch('/api/superadmin/orgs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, active_inactive: newActive ? 'active' : 'inactive' }),
    });
    showToast(newActive ? 'Organisation enabled' : 'Organisation disabled');
    loadOrgs();
  }

  function handleSaved() {
    setModal(null);
    showToast('Organisation saved!');
    loadOrgs();
  }

  const totalInspections = orgs.reduce((s, o) => s + (o.stats?.totalInspections || 0), 0);
  const totalPending     = orgs.reduce((s, o) => s + (o.stats?.pendingReview    || 0), 0);
  const activeOrgs       = orgs.filter((o) => o.active).length;

  return (
    <>
      <Head><title>AFTS Super Admin</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Nav */}
        <nav className="text-white shadow-lg sticky top-0 z-40"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-base">🏛 AFTS Super Admin</div>
              <div className="text-xs text-indigo-300">Multi-Organisation Control Panel</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-indigo-200 hidden sm:block">{user?.name}</span>
              <button onClick={logout}
                className="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg">
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Orgs',        value: orgs.length,      color: '#4f46e5' },
              { label: 'Active Orgs',        value: activeOrgs,       color: '#16a34a' },
              { label: 'Total Inspections',  value: totalInspections, color: '#0891b2' },
              { label: 'Pending Review',     value: totalPending,     color: '#d97706' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-bold text-gray-700">Organisations</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowConfig((v) => !v)}
                className="text-sm border border-indigo-200 text-indigo-600 rounded-xl px-4 py-2 hover:bg-indigo-50">
                {showConfig ? 'Hide' : '⚙ Vercel ENV'}
              </button>
              <button onClick={() => setModal('add')}
                className="text-sm text-white rounded-xl px-4 py-2 font-medium"
                style={{ background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)' }}>
                + Add Organisation
              </button>
            </div>
          </div>

          {/* ORG_CONFIGS panel */}
          {showConfig && <OrgConfigsPanel orgs={orgs} />}

          {/* Errors / loading */}
          {loading && <div className="text-center py-16 text-gray-400 text-sm">Loading organisations…</div>}
          {error   && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

          {/* Org grid */}
          {!loading && !error && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((org) => (
                <OrgCard key={org.id} org={org}
                  onEdit={(o) => setModal({ edit: o })}
                  onToggle={handleToggle}
                  onSetup={(o) => setModal({ setup: o })} />
              ))}
              {orgs.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-400 text-sm">
                  No organisations yet. Click <strong>+ Add Organisation</strong> to get started.
                </div>
              )}
            </div>
          )}

          {/* Feature suggestions notice */}
          <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-sm text-indigo-700">
            <p className="font-semibold mb-1">Planned features (coming next):</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-indigo-600">
              <li>One-click org sheet initialisation wizard (auto-create all tabs + first admin)</li>
              <li>SuperAdmin users management (add / revoke portal access)</li>
              <li>Broadcast announcement to all orgs simultaneously</li>
              <li>Cross-org inspection report / CSV export</li>
              <li>Impersonate — generate time-limited admin token for any org</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'add' && (
        <OrgModal onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.edit && (
        <OrgModal org={modal.edit} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  );
}

export default withAuth(SuperAdminDashboard, ['SuperAdmin']);

