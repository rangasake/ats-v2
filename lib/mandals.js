import { getRows } from './googleSheets';

const MANDALS_CACHE_TTL = 5 * 60 * 1000;

const cache = new Map();

export async function getMandalRtoMap(spreadsheetId) {
  const cached = cache.get(spreadsheetId);

  if (
    cached &&
    Date.now() - cached.timestamp < MANDALS_CACHE_TTL
  ) {
    return cached.map;
  }

  const rows = await getRows(
    spreadsheetId,
    'mandals'
  );

  const map = {};

  for (const row of rows) {
    const mandal = String(row.mandal || '').trim();
    const rto = String(row.rto || '').trim();

    if (!mandal) continue;

    map[mandal] = rto;
  }

  cache.set(spreadsheetId, {
    map,
    timestamp: Date.now(),
  });

  return map;
}

export async function getMandals(spreadsheetId) {
  const map = await getMandalRtoMap(spreadsheetId);

  return Object.keys(map);
}

export async function getRtoForMandal(
  spreadsheetId,
  mandal
) {
  const map = await getMandalRtoMap(spreadsheetId);

  return map[mandal] || '';
}