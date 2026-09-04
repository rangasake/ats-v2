import { requireAuth } from '../../../lib/auth';
import { ensureHeaders, getRows, appendRows, deleteRowsByValue } from '../../../lib/googleSheets';
import { SHEETS } from '../../../lib/constants';
import { getOrgByHost } from '../../../lib/orgs';

const HEADERS = ['ts', 'v_num', 'b_num', 'b_nam'];

function cleanItems(input) {
  const items = [];
  for (const raw of input) {
    const v_num = String(raw.v_num || '').trim().toUpperCase();
    if (!v_num) continue;
    items.push({
      v_num,
      b_num: String(raw.b_num || '').trim(),
      b_nam: String(raw.b_nam || '').trim(),
    });
  }
  return items;
}

async function handler(req, res) {
  const org = getOrgByHost(req.headers.host);
  await ensureHeaders(org.sheetId, SHEETS.ALLOW_LIST, HEADERS);

  // GET — list all allowed vehicles (newest first)
  if (req.method === 'GET') {
    try {
      const rows = await getRows(org.sheetId, SHEETS.ALLOW_LIST);
      const list = rows.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
      return res.status(200).json({ allowlist: list, total: list.length });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST — add one or many vehicles (from JSON items or raw CSV text)
  if (req.method === 'POST') {
    const { items, csv } = req.body || {};
    const input = Array.isArray(items) ? items : [];
    const parsed = cleanItems(input);

    if (csv) {
      const lines = String(csv).split(/\r?\n/).filter((l) => l.trim() !== '');
      let started = false;
      for (const line of lines) {
        const cells = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        const clean = cells.map((c) => (c.startsWith('"') && c.endsWith('"') ? c.slice(1, -1) : c).trim());
        const first = clean[0] || '';
        if (!started) {
          const lower = first.toLowerCase();
          const isHeader = /v_?num|vehicle|veh|reg|plate/.test(lower) || (clean[1] || '').toLowerCase().includes('book');
          if (isHeader) { started = true; continue; }
          started = true;
        }
        if (!first) continue;
        parsed.push({ v_num: first.toUpperCase(), b_num: clean[1] || '', b_nam: clean[2] || '' });
      }
    }

    if (parsed.length === 0) return res.status(400).json({ error: 'No valid vehicle rows provided' });

    try {
      const now = new Date().toISOString();
      await appendRows(org.sheetId, SHEETS.ALLOW_LIST, parsed.map((p) => ({ ...p, ts: now })));
      return res.status(200).json({ success: true, added: parsed.length });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // DELETE — remove every row matching a vehicle number
  if (req.method === 'DELETE') {
    const { v_num } = req.body || {};
    if (!v_num) return res.status(400).json({ error: 'v_num required' });
    try {
      const { deleted } = await deleteRowsByValue(org.sheetId, SHEETS.ALLOW_LIST, 'v_num', v_num);
      return res.status(200).json({ success: true, deleted });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler, ['Admin']);