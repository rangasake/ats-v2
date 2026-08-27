// lib/orgs.js

const ORGS = {
  'konaseema-vfs.vercel.app': {
    id: 'amalapuram',
    title: 'Amalapuram',
    sheetId: process.env.KONASEEMA_SHEET_ID,

    CLOUDINARY_CLOUD_NAME: process.env.KONASEEMA_CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.KONASEEMA_CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.KONASEEMA_CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER: process.env.KONASEEMA_CLOUDINARY_FOLDER,

    cname: 'E S R INFRA SOLUTIONS',
    adrs: 'ATS Centre, SH 14, A Vemavaram, Dr B R Ambedkar Konaseema — 533577',
  },

  'krishna-vfs.vercel.app': {
    id: 'krishna',
    title: 'Krishna',
    sheetId: process.env.KRISHNA_SHEET_ID,

    CLOUDINARY_CLOUD_NAME: process.env.KRISHNA_CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.KRISHNA_CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.KRISHNA_CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER: process.env.KRISHNA_CLOUDINARY_FOLDER,

    cname: 'Company Name',
    adrs: 'ATS Centre, Krishna Dist — PINCODE',
  },

  'localhost:3000': {
    id: 'dev_org',
    title: 'Development Mode',
    sheetId: process.env.DEV_SHEET_ID,

    CLOUDINARY_CLOUD_NAME: process.env.DEV_CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.DEV_CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.DEV_CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER: process.env.DEV_CLOUDINARY_FOLDER,

    cname: 'Dev SOLUTIONS',
    adrs: 'Local Pincode',
  },
};

export function getOrgByHost(host) {
  if (!host) {
    return ORGS['localhost:3000'];
  }

  // Remove port and normalize hostname
  const domain = host.split(':')[0].toLowerCase();

  // Local development
  if (domain === 'localhost' || domain === '127.0.0.1') {
    return ORGS['localhost:3000'];
  }

  // Production organization
  const org = ORGS[domain];

  if (!org) {
    console.error(`[ORG] Unknown host: ${host}`);
    return null;
  }

  return org;
}