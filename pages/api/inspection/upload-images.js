// pages/api/inspection/upload-images.js

import { requireAuth } from '../../../lib/auth';
import { getOrgByHost } from '../../../lib/orgs';

const IMAGE_CONFIG = {
  maxSizeBytes: parseInt(
    process.env.IMAGE_MAX_SIZE_BYTES || '2097152'
  ),
  maxCount: parseInt(
    process.env.IMAGE_MAX_COUNT || '4'
  ),
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ],
};

// ── Parse base64 dataURL ──────────────────────────────────────
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);

  if (!match) return null;

  return {
    mimeType: match[1],
    b64: match[2],
  };
}

// ── Generate Cloudinary signature ─────────────────────────────
async function generateSignature(params, apiSecret) {
  const str =
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + apiSecret;

  const { createHash } = await import('crypto');

  return createHash('sha1')
    .update(str)
    .digest('hex');
}

// ── Upload one image to Cloudinary ────────────────────────────
async function uploadToCloudinary(
  b64Data,
  mimeType,
  publicId,
  folder,
  cloudName,
  apiKey,
  apiSecret
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signParams = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = await generateSignature(
    signParams,
    apiSecret
  );

  const formData = new FormData();

  formData.append(
    'file',
    `data:${mimeType};base64,${b64Data}`
  );

  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ||
      `Cloudinary upload failed (${response.status})`
    );
  }

  return {
    fileId: data.public_id,
    directUrl: data.secure_url,
    viewUrl: data.secure_url,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
    name: publicId,
  };
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // ─────────────────────────────────────────────────────────
  // Resolve organization from the domain
  // ─────────────────────────────────────────────────────────

  const host = req.headers.host;
  const org = getOrgByHost(host);

  console.log('Upload request host:', host);
  console.log('Upload request organization:', org?.id);

  if (!org) {
    return res.status(400).json({
      error: 'Organization could not be determined',
    });
  }

  // ─────────────────────────────────────────────────────────
  // Get organization-specific Cloudinary configuration
  // ─────────────────────────────────────────────────────────

  const CLOUDINARY_CLOUD_NAME =
    org.CLOUDINARY_CLOUD_NAME || '';

  const CLOUDINARY_API_KEY =
    org.CLOUDINARY_API_KEY || '';

  const CLOUDINARY_API_SECRET =
    org.CLOUDINARY_API_SECRET || '';

  const CLOUDINARY_FOLDER =
    org.CLOUDINARY_FOLDER || '';

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
  ) {
    console.error(
      `Cloudinary configuration missing for organization: ${org.id}`
    );

    return res.status(500).json({
      error: 'Cloudinary not configured for this organization',
    });
  }

  const {
    inspection_id,
    vehicle_number,
    images,
  } = req.body;

  // ─────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────

  if (!inspection_id) {
    return res.status(400).json({
      error: 'inspection_id is required',
    });
  }

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({
      error: 'No images provided',
    });
  }

  if (images.length > IMAGE_CONFIG.maxCount) {
    return res.status(400).json({
      error: `Maximum ${IMAGE_CONFIG.maxCount} images allowed`,
    });
  }

  // ─────────────────────────────────────────────────────────
  // Folder
  // ─────────────────────────────────────────────────────────

  const safeVehicleNum = vehicle_number
    ? vehicle_number
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
    : 'UNKNOWN';

  const uploadFolder =
    `${CLOUDINARY_FOLDER}/${safeVehicleNum}`;

  const uploaded = [];
  const errors = [];

  // ─────────────────────────────────────────────────────────
  // Upload images
  // ─────────────────────────────────────────────────────────

  for (let i = 0; i < images.length; i++) {
    const { dataUrl, label } = images[i];

    if (!dataUrl?.startsWith('data:')) {
      errors.push(`Image ${i + 1}: Invalid format`);
      continue;
    }

    const parsed = parseDataUrl(dataUrl);

    if (!parsed) {
      errors.push(
        `Image ${i + 1}: Could not parse image data`
      );
      continue;
    }

    if (
      !IMAGE_CONFIG.allowedTypes.includes(
        parsed.mimeType
      )
    ) {
      errors.push(
        `Image ${i + 1}: Type not allowed (use JPEG/PNG/WebP)`
      );
      continue;
    }

    const sizeBytes = Math.ceil(
      parsed.b64.length * 0.75
    );

    if (
      sizeBytes > IMAGE_CONFIG.maxSizeBytes
    ) {
      const maxMB = (
        IMAGE_CONFIG.maxSizeBytes /
        1024 /
        1024
      ).toFixed(1);

      errors.push(
        `Image ${i + 1}: Exceeds ${maxMB} MB`
      );

      continue;
    }

    try {
      const publicId =
        `${inspection_id}_img${i + 1}_${Date.now()}`;

      const result = await uploadToCloudinary(
        parsed.b64,
        parsed.mimeType,
        publicId,
        uploadFolder,
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET
      );

      uploaded.push({
        ...result,
        label: label || `Image ${i + 1}`,
        index: i + 1,
      });
    } catch (err) {
      console.error(
        `Cloudinary upload error img ${i + 1}:`,
        err.message
      );

      errors.push(
        `Image ${i + 1}: Upload failed — ${err.message}`
      );
    }
  }

  if (uploaded.length === 0) {
    return res.status(500).json({
      error: 'All uploads failed',
      details: errors,
    });
  }

  return res.status(200).json({
    success: true,
    uploaded,
    errors,
    count: uploaded.length,
  });
}

export default requireAuth(
  handler,
  ['Inspector', 'Admin']
);