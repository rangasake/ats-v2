import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES, ADMIN_ROLES, LANE_TYPES, DOC_CHECKLIST_ITEMS, VISUAL_CHECKLIST_ITEMS } from '../../lib/constants';

function LaneConfig() {
  const [configs, setConfigs] = useState([]);
  const [selectedLane, setSelectedLane] = useState('');
  const [docHidden, setDocHidden] = useState([]);
  const [visualHidden, setVisualHidden] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchConfigs(); }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lane-config');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch (e) {}
    finally { setLoading(false); }
  }

  function selectLane(lt) {
    setSelectedLane(lt);
    setSuccess('');
    const cfg = configs.find((c) => c.lane_type === lt);
    if (cfg) {
      setDocHidden(tryParse(cfg.doc_hidden_items, []));
      setVisualHidden(tryParse(cfg.visual_hidden_items, []));
    } else {
      setDocHidden([]);
      setVisualHidden([]);
    }
  }

  function toggleDoc(id) {
    setDocHidden((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleVisual(id) {
    setVisualHidden((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    setSaving(true);
    setSuccess('');
    try {
      await fetch('/api/admin/lane-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane_type: selectedLane, doc_hidden_items: docHidden, visual_hidden_items: visualHidden }),
      });
      setSuccess('Saved!');
      fetchConfigs();
    } catch (e) {}
    finally { setSaving(false); }
  }

  return (
    <>
      <Head><title>Lane Config - AFTS</title></Head>
      <AppLayout title="Lane Configuration">
        <p className="text-sm text-gray-500 mb-4">Configure which checklist items show/hide for each lane type.</p>

        {/* Lane Selector */}
        <div className="card mb-4">
          <label className="form-label">Select Lane Type</label>
          <select
            value={selectedLane}
            onChange={(e) => selectLane(e.target.value)}
            className="form-input"
          >
            <option value="">-- Select Lane Type --</option>
            {LANE_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt} {configs.find((c) => c.lane_type === lt) ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedLane && (
          <>
            {/* Document Checklist Config */}
            <div className="card mb-4">
              <h2 className="section-title">📄 Document Checklist — Hide Items</h2>
              <p className="text-xs text-gray-400 mb-3">Checked items will be <strong>hidden</strong> for {selectedLane}</p>
              {DOC_CHECKLIST_ITEMS.map((item) => (
                <label key={item.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docHidden.includes(item.id)}
                    onChange={() => toggleDoc(item.id)}
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                  <span className={`text-sm ${docHidden.includes(item.id) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Visual Checklist Config */}
            <div className="card mb-4">
              <h2 className="section-title">🔍 Visual Checklist — Hide Items</h2>
              <p className="text-xs text-gray-400 mb-3">Checked items will be <strong>hidden</strong> for {selectedLane}</p>
              {VISUAL_CHECKLIST_ITEMS.map((item) => (
                <label key={item.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visualHidden.includes(item.id)}
                    onChange={() => toggleVisual(item.id)}
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                  <span className={`text-sm ${visualHidden.includes(item.id) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">✅ {success}</div>
            )}

            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : '💾 Save Configuration'}
            </button>
          </>
        )}
      </AppLayout>
    </>
  );
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default withAuth(LaneConfig, ADMIN_ROLES);
