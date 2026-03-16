// pages/api/inspection/upload-images.js
// ─────────────────────────────────────────────────────────────
// Receives up to 4 base64 images, compresses them server-side,
// uploads to a Google Drive folder, returns public URLs.
// ─────────────────────────────────────────────────────────────

import { requireAuth } from '../../../lib/auth';
import { google } from 'googleapis';
import { Readable } from 'stream';

// ── Config (all tunable via env vars) ────────────────────────
const IMAGE_CONFIG = {
  maxSizeBytes: parseInt(process.env.IMAGE_MAX_SIZE_BYTES || '2097152'),   // 2 MB per image
  maxCount:     parseInt(process.env.IMAGE_MAX_COUNT     || '4'),          // max 4 images
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  // Google Drive folder ID where images will be stored
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
};

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',   // ← add this scope to your service account
];

function getDriveClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    SCOPES
  );
  return google.drive({ version: 'v3', auth });
}

// Convert base64 data-URL → { buffer, mimeType }
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

// Upload a single buffer to Google Drive, make it publicly readable
async function uploadToDrive(drive, buffer, mimeType, fileName, folderId) {
  const stream = Readable.from(buffer);

  const fileMetadata = {
    name: fileName,
    // folderId MUST be a folder owned by a real Google account
    // that has shared Editor access to the service account.
    // The file inherits quota from the folder owner, not the service account.
    ...(folderId ? { parents: [folderId] } : {}),
  };

  const media = { mimeType, body: stream };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink',
    // Required when uploading into a folder owned by another account
    supportsAllDrives: true,
  });

  const fileId = file.data.id;

  // Make file publicly readable (anyone with link)
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  // Direct image URL (works for embedding)
  const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  const viewUrl   = `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, directUrl, viewUrl, name: file.data.name };
}

// ── Next.js body size config ──────────────────────────────────
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // 4 images × up to ~4 MB each (pre-compress)
    },
  },
};

// ── Handler ───────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { inspection_id, images } = req.body;
  // images: array of { dataUrl, label } — dataUrl is base64 data URL from client

  if (!inspection_id) {
    return res.status(400).json({ error: 'inspection_id is required' });
  }
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }
  if (images.length > IMAGE_CONFIG.maxCount) {
    return res.status(400).json({ error: `Maximum ${IMAGE_CONFIG.maxCount} images allowed` });
  }

  const drive = getDriveClient();
  const uploaded = [];
  const errors = [];

  for (let i = 0; i < images.length; i++) {
    const { dataUrl, label } = images[i];

    // ── Validate ────────────────────────────────────────────
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      errors.push(`Image ${i + 1}: Invalid format`);
      continue;
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      errors.push(`Image ${i + 1}: Could not parse image data`);
      continue;
    }

    if (!IMAGE_CONFIG.allowedTypes.includes(parsed.mimeType)) {
      errors.push(`Image ${i + 1}: Type ${parsed.mimeType} not allowed. Use JPEG, PNG, or WebP`);
      continue;
    }

    if (parsed.buffer.length > IMAGE_CONFIG.maxSizeBytes) {
      const maxMB = (IMAGE_CONFIG.maxSizeBytes / 1024 / 1024).toFixed(1);
      errors.push(`Image ${i + 1}: Exceeds ${maxMB} MB limit`);
      continue;
    }

    // ── Upload ──────────────────────────────────────────────
    try {
      const ext = parsed.mimeType.split('/')[1].replace('jpeg', 'jpg');
      const fileName = `${inspection_id}_img${i + 1}_${Date.now()}.${ext}`;
      const result = await uploadToDrive(
        drive,
        parsed.buffer,
        parsed.mimeType,
        fileName,
        IMAGE_CONFIG.driveFolderId
      );
      uploaded.push({ ...result, label: label || `Image ${i + 1}`, index: i + 1 });
    } catch (err) {
      console.error(`Upload error for image ${i + 1}:`, err);
      errors.push(`Image ${i + 1}: Upload failed — ${err.message}`);
    }
  }

  if (uploaded.length === 0) {
    return res.status(500).json({ error: 'All uploads failed', details: errors });
  }

  return res.status(200).json({
    success: true,
    uploaded,           // array of { fileId, directUrl, viewUrl, label, index }
    errors,             // partial failures if any
    count: uploaded.length,
  });
}

export default requireAuth(handler, ['Inspector', 'Admin']);