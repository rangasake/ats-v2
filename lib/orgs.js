// lib/orgs.js

const ORGS = {
  'client-a.com': {
    id: 'amalapuram',
    title: 'Amalapuram A Vehicle Fitness',
    sheetId: '1peV1YKBrZBpPzOHKxbaJ4POU0awNws4vz7G4nCMxe78',
    CLOUDINARY_CLOUD_NAME: 'dlqmi7jca',
    CLOUDINARY_API_KEY: '368335488122156',
    CLOUDINARY_API_SECRET: 'yknY1C15wCJYKLiSVUTnrntx6UY',
    CLOUDINARY_FOLDER: 'ats_inspections'
  },
  'client-b.com': {
    id: 'krishna',
    title: 'Krishna Vehicle Fitness',
    sheetId: '11GZwYw8kQ5EO7O0sl9DbjuPimlDvQxIo9w_arC9FclQ',
    CLOUDINARY_CLOUD_NAME: 'dlqmi7jca',
    CLOUDINARY_API_KEY: '368335488122156',
    CLOUDINARY_API_SECRET: 'yknY1C15wCJYKLiSVUTnrntx6UY',
    CLOUDINARY_FOLDER: 'ats_inspections'
  },
  'localhost:3000': {
    id: 'dev_org',
    title: 'Development Mode',
    sheetId: '1peV1YKBrZBpPzOHKxbaJ4POU0awNws4vz7G4nCMxe78',
    CLOUDINARY_CLOUD_NAME: 'dlqmi7jca',
    CLOUDINARY_API_KEY: '368335488122156',
    CLOUDINARY_API_SECRET: 'yknY1C15wCJYKLiSVUTnrntx6UY',
    CLOUDINARY_FOLDER: 'ats_inspections'
  },
};

export function getOrgByHost(host) {
  // This handles 'localhost:3000' or 'localhost' or '127.0.0.1:3000'
  if (!host) return ORGS['localhost:3000'];
  
  const domain = host.split(':')[0]; // Get just 'localhost'
  if (domain === 'localhost' || domain === '127.0.0.1') {
    return ORGS['localhost:3000'];
  }
  
  return ORGS[host] || ORGS['localhost:3000'];
}