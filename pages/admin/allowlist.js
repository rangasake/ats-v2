import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import AppLayout from '../../components/layout/AppLayout';
import { withAuth } from '../../lib/useAuth';
import { ROLES } from '../../lib/constants';

function splitLine(line) {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  const cells = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { cells.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function mapHeader(h) {
  const x = String(h || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (/v_?num|vehicle|veh|reg|plate/.test(x)) return 'v_num';
  if (/(b_?num|booking\s*(num|no|number)|book\s*(num|no|number))/.test(x)) return 'b_num';
  if (/(b_?nam|booking\s*name|book\s*name)/.test(x)) return 'b_nam';
  return null;
}

function parseCSVText(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const rows = lines.map(splitLine);
  const headerMap = rows[0].map(mapHeader);
  const hasHeader = headerMap.includes('v_num');
  const start = hasHeader ? 1 : 0;

  const out = [];
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    let v = '';
    let b = '';
    let bn = '';
    if (hasHeader) {
      const vi = headerMap.indexOf('v_num');
      const bi = headerMap.indexOf('b_num');
      const ni = headerMap.indexOf('b_nam');
      v = row[vi];
      if (bi !== -1) b = row[bi];
      if (ni !== -1) bn = row[ni];
    } else {
      v = row[0];
      b = row[1];
      bn = row[2];
    }
    v = (v || '').trim();
    if (!v) continue;
    out.push({ v_num: v.toUpperCase(), b_num: (b || '').trim(), b_nam: (bn || '').trim() });
  }
  return out;
}

function AdminAllowList() {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pending, setPending]   = useState([]);
  const [csvText, setCsvText]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState('');
  const [single, setSingle]     = useState({ v_num: '', b_num: '', b_nam: '' });
  const fileRef                 = useRef(null);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/allowlist');
      const data = await res.json();
      setList(data.allowlist || []);
    } catch (e) {}
    finally { setLoading(false); }
  }

  function handleSingleAdd(e) {
    e.preventDefault();
    const v_num = single.v_num.trim().toUpperCase();
    if (!v_num) return;
    setPending([...pending, { v_num, b_num: single.b_num.trim(), b_nam: single.b_nam.trim() }]);
    setSingle({ v_num: '', b_num: '', b_nam: '' });
    setError('');
  }

  function handleCsvText(value) {
    setCsvText(value);
    setPending(parseCSVText(value));
    setError('');
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleCsvText(ev.target.result);
    reader.readAsText(file);
  }

  function removePending(i) {
    setPending(pending.filter((_, idx) => idx !== i));
  }

  async function handleUpload() {
    if (pending.length === 0) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: pending }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(`${data.added} vehicle${data.added === 1 ? '' : 's'} added to allow list`);
      setPending([]);
      setCsvText('');
      fetchList();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v_num) {
    if (!confirm(`Remove ${v_num} from allow list? This deletes all matching rows.`)) return;
    setDeleting(v_num);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/allowlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v_num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setSuccess(`Removed ${data.deleted} row${data.deleted === 1 ? '' : 's'} for ${v_num}`);
      fetchList();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting('');
    }
  }

  return (
    <>
      <Head><title>Allow List - AFTS</title></Head>
      <AppLayout title="✅ Allow List">
        <p className="text-sm text-gray-500 mb-4">
          Add vehicles allowed to enter the station. Vehicle number, booking number and booking name only.
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">✅ {success}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">⚠️ {error}</div>
        )}

        {/* ── Single vehicle ─────────────────────────────────────────────── */}
        <div className="card mb-4">
          <h2 className="section-title">➕ Add Single Vehicle</h2>
          <form onSubmit={handleSingleAdd}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="form-label">Vehicle Number</label>
                <input
                  type="text"
                  value={single.v_num}
                  onChange={(e) => setSingle({ ...single, v_num: e.target.value })}
                  className="form-input uppercase"
                  placeholder="AP37AB1234"
                  required
                />
              </div>
              <div>
                <label className="form-label">Booking Number</label>
                <input
                  type="text"
                  value={single.b_num}
                  onChange={(e) => setSingle({ ...single, b_num: e.target.value })}
                  className="form-input"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="form-label">Booking Name</label>
                <input
                  type="text"
                  value={single.b_nam}
                  onChange={(e) => setSingle({ ...single, b_nam: e.target.value })}
                  className="form-input"
                  placeholder="Optional"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Add to List</button>
          </form>
        </div>

        {/* ── Bulk upload ────────────────────────────────────────────────── */}
        <div className="card mb-4">
          <h2 className="section-title">📄 Upload CSV / Paste Data</h2>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-800 text-white active:scale-95"
            >
              📁 Choose CSV File
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => { setCsvText(''); setPending([]); }}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Format: <code className="bg-gray-100 px-1 rounded">vehicle_number, booking_number, booking_name</code> — one row per line. A header row is optional.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => handleCsvText(e.target.value)}
            rows={6}
            placeholder={'AP37AB1234, BK1001, RAMESH\nAP37AC5678, , SURESH'}
            className="form-input resize-y font-mono text-sm"
          />
        </div>

        {/* ── Staged preview ─────────────────────────────────────────────── */}
        {pending.length > 0 && (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">🔎 Preview — {pending.length} vehicle{pending.length === 1 ? '' : 's'}</h2>
              <button type="button" onClick={() => setPending([])} className="text-sm font-semibold text-red-500">
                Clear
              </button>
            </div>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-2 font-semibold">#</th>
                    <th className="py-2 pr-2 font-semibold">Vehicle Number</th>
                    <th className="py-2 pr-2 font-semibold">Booking Number</th>
                    <th className="py-2 pr-2 font-semibold">Booking Name</th>
                    <th className="py-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-2 font-mono font-semibold text-gray-800">{p.v_num}</td>
                      <td className="py-2 pr-2 text-gray-600">{p.b_num || '—'}</td>
                      <td className="py-2 pr-2 text-gray-600">{p.b_nam || '—'}</td>
                      <td className="py-2">
                        <button type="button" onClick={() => removePending(i)} className="text-red-400 hover:text-red-600" title="Remove">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleUpload} disabled={saving} className="btn-primary">
              {saving ? 'Uploading…' : `🚀 Upload ${pending.length} to Allow List`}
            </button>
          </div>
        )}

        {/* ── Existing entries ───────────────────────────────────────────── */}
        <div className="card">
          <h2 className="section-title">🗂️ Allow List ({list.length} vehicle{list.length === 1 ? '' : 's'})</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No vehicles on the allow list yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-2 font-semibold">Vehicle Number</th>
                    <th className="py-2 pr-2 font-semibold">Booking Number</th>
                    <th className="py-2 pr-2 font-semibold">Booking Name</th>
                    <th className="py-2 pr-2 font-semibold">Added</th>
                    <th className="py-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-2 font-mono font-semibold text-gray-800">{row.v_num}</td>
                      <td className="py-2 pr-2 text-gray-600">{row.b_num || '—'}</td>
                      <td className="py-2 pr-2 text-gray-600">{row.b_nam || '—'}</td>
                      <td className="py-2 pr-2 text-gray-400">
                        {row.ts ? new Date(row.ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.v_num)}
                          disabled={deleting === row.v_num}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 disabled:opacity-50"
                        >
                          {deleting === row.v_num ? '...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}

export default withAuth(AdminAllowList, [ROLES.ADMIN]);