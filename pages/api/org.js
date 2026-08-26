// pages/api/org.js

import { getOrgByHost } from '../../lib/orgs';

export default function handler(req, res) {
  const host = req.headers.host;

  const org = getOrgByHost(host);

  // Only expose safe client-side fields
  return res.status(200).json({
    id: org.id,
    title: org.title,
    sheetId: org.sheetId,
  });
}