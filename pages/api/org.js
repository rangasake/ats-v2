import { getOrgByHost } from '../../lib/orgs';

export default function handler(req, res) {
  const host = req.headers.host;
  const org = getOrgByHost(host);

  if (!org) {
    return res.status(404).json({
      error: 'Organization not found',
    });
  }

  return res.status(200).json({
    id: org.id,
    title: org.title,
    sheetId: org.sheetId,
  });
}