// lib/orgs.js

const ORGS = {
  'konaseema-vfs.vercel.app': {
    id: 'amalapuram',
    title: 'Amalapuram ',
    sheetId: '1peV1YKBrZBpPzOHKxbaJ4POU0awNws4vz7G4nCMxe78',
    CLOUDINARY_CLOUD_NAME: 'dlqmi7jca',
    CLOUDINARY_API_KEY: '368335488122156',
    CLOUDINARY_API_SECRET: 'yknY1C15wCJYKLiSVUTnrntx6UY',
    CLOUDINARY_FOLDER: 'ats_inspections',
    cname: 'E S R INFRA SOLUTIONS',
    adrs: 'ATS Centre, SH 14, A Vemavaram, Dr B R Ambedkar Konaseema — 533577',
  },
  'krishna-vfs.vercel.app': {
    id: 'krishna',
    title: 'Krishna',
    sheetId: '11GZwYw8kQ5EO7O0sl9DbjuPimlDvQxIo9w_arC9FclQ',
    CLOUDINARY_CLOUD_NAME: 'otamnpl4',
    CLOUDINARY_API_KEY: '455989458469195',
    CLOUDINARY_API_SECRET: 'jZCWCOFL-d8NXrVASRQgnXQMT7o',
    CLOUDINARY_FOLDER: 'inspections_images',
    cname: 'Company Name',
    adrs: 'ATS Centre, Krishna Dist — PINCODE',
  },
  'localhost:3000': {
    id: 'dev_org',
    title: 'Development Mode',
    sheetId: '1loq0prkdA4CfiV2boGZpQjvJ3bbrZY_vCx11-1damuI',
    CLOUDINARY_CLOUD_NAME: 'otamnpl4',
    CLOUDINARY_API_KEY: '455989458469195',
    CLOUDINARY_API_SECRET: 'jZCWCOFL-d8NXrVASRQgnXQMT7o',
    CLOUDINARY_FOLDER: 'inspections_images',
    cname: 'Dev SOLUTIONS',
    adrs: 'Local Pincode'

  },
};

export function getOrgByHost(host) {
  if (!host) return ORGS['localhost:3000'];

  const domain = host.split(':')[0];

  if (domain === 'localhost' || domain === '127.0.0.1') {
    return ORGS['localhost:3000'];
  }

  return ORGS[host] || ORGS['localhost:3000'];
}