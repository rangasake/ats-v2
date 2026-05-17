// components/ui/ImageUploader.js
// ─────────────────────────────────────────────────────────────
// Features:
//  • Up to 4 images (configurable via MAX_IMAGES)
//  • Gallery pick OR camera capture
//  • Client-side compression before upload (configurable quality)
//  • Full validation: type, size, count
//  • Preview with remove button
//  • Upload progress per image
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';

// ── Client-side compression config ───────────────────────────
const COMPRESS_CONFIG = {
  maxWidthPx:   parseInt(process.env.NEXT_PUBLIC_IMG_MAX_WIDTH   || '1024'),  // resize to max 1024px wide
  quality:      parseFloat(process.env.NEXT_PUBLIC_IMG_QUALITY   || '0.65'),  // JPEG quality 0–1 (0.65 = low–medium)
  outputFormat: process.env.NEXT_PUBLIC_IMG_FORMAT               || 'image/jpeg', // always convert to JPEG
  maxFileSizeMB:parseFloat(process.env.NEXT_PUBLIC_IMG_MAX_MB    || '2'),     // reject after compress if still > 2MB
};

const MAX_IMAGES      = 4;
const ALLOWED_TYPES   = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXT_STR = 'JPG, PNG, WebP';

// ── Compress a File → base64 data URL ────────────────────────
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        // Calculate scaled dimensions
        let { width, height } = img;
        if (width > COMPRESS_CONFIG.maxWidthPx) {
          height = Math.round((height * COMPRESS_CONFIG.maxWidthPx) / width);
          width  = COMPRESS_CONFIG.maxWidthPx;
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(
          COMPRESS_CONFIG.outputFormat,
          COMPRESS_CONFIG.quality
        );

        // Check compressed size
        const base64Data = dataUrl.split(',')[1];
        const sizeBytes  = Math.ceil((base64Data.length * 3) / 4);
        const maxBytes   = COMPRESS_CONFIG.maxFileSizeMB * 1024 * 1024;

        if (sizeBytes > maxBytes) {
          reject(new Error(
            `Image still ${(sizeBytes / 1024 / 1024).toFixed(1)} MB after compression. ` +
            `Max allowed: ${COMPRESS_CONFIG.maxFileSizeMB} MB`
          ));
          return;
        }

        resolve({ dataUrl, sizeBytes, width, height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Burn lat/long, inspection ID and timestamp onto image canvas ──
function burnLatLong(dataUrl, latLong, inspectionId, timestamp) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0);

      // Two-line dark bar at bottom
      const fontSize = Math.max(11, Math.round(img.height * 0.026));
      const lineH    = fontSize + 6;
      const barH     = lineH * 2 + 8;
      ctx.fillStyle  = 'rgba(0,0,0,0.60)';
      ctx.fillRect(0, img.height - barH, img.width, barH);

      ctx.fillStyle    = '#ffffff';
      ctx.font         = `bold ${fontSize}px Arial`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      // Line 1 — coordinates
      ctx.fillText(`\uD83D\uDCCD ${latLong}`, img.width / 2, img.height - barH + lineH / 2 + 4);

      // Line 2 — inspection ID + timestamp
      const line2 = [inspectionId && `ID: ${inspectionId}`, timestamp].filter(Boolean).join('  |  ');
      ctx.fillText(line2, img.width / 2, img.height - lineH / 2 - 4);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

// ── Validate a raw File before compressing ────────────────────
function validateFile(file, existingCount) {
  if (existingCount >= MAX_IMAGES) {
    return `Maximum ${MAX_IMAGES} images allowed`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid type "${file.type}". Allowed: ${ALLOWED_EXT_STR}`;
  }
  // Raw file size check (before compress): warn if > 20 MB
  if (file.size > 20 * 1024 * 1024) {
    return 'File too large (max 20 MB raw). Please use a smaller image.';
  }
  return null;
}

// ── Individual image slot ─────────────────────────────────────
function ImageSlot({ slot, index, onRemove }) {
  if (!slot) {
    return (
      <div className="aspect-square bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl">
        📷
      </div>
    );
  }

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-200">
      <img
        src={slot.dataUrl}
        alt={slot.label}
        className="w-full h-full object-cover"
      />
      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 text-center truncate">
        {slot.label}
      </div>
      {/* Size badge */}
      <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
        {(slot.sizeBytes / 1024).toFixed(0)}KB
      </div>
      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold shadow"
      >
        ×
      </button>
      {/* Upload status */}
      {slot.status === 'uploading' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {slot.status === 'done' && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
          <span className="text-2xl">✅</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function ImageUploader({ inspectionId, vehicleNumber, latLong = '', onUploadComplete, existingUrls = [] }) {
  const [slots, setSlots]           = useState(
    // Pre-fill with any already-uploaded URLs (e.g. resume)
    existingUrls.map((u, i) => ({ dataUrl: u.directUrl, label: u.label || `Image ${i+1}`, sizeBytes: 0, status: 'done', ...u }))
  );
  const [errors, setErrors]         = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [uploadDone, setUploadDone] = useState(existingUrls.length > 0);
  const [compressionInfo, setCompressionInfo] = useState([]);

  const fileInputRef   = useRef();
  const cameraInputRef = useRef();

  // IMAGE LABELS — customise as needed
  const IMAGE_LABELS = ['Front View', 'Rear View', 'Left Side', 'Right Side'];

  async function handleFiles(files) {
    const newErrors = [];
    const newSlots  = [...slots];
    const newInfo   = [...compressionInfo];

    for (const file of Array.from(files)) {
      const validErr = validateFile(file, newSlots.length);
      if (validErr) { newErrors.push(validErr); continue; }

      try {
        const nextIndex = newSlots.length;
        const label     = IMAGE_LABELS[nextIndex] || `Image ${nextIndex + 1}`;

        const { dataUrl, sizeBytes, width, height } = await compressImage(file);

        newSlots.push({ dataUrl, label, sizeBytes, status: 'ready', file });
        newInfo.push({
          label,
          original: `${(file.size / 1024).toFixed(0)} KB`,
          compressed: `${(sizeBytes / 1024).toFixed(0)} KB`,
          saved: `${Math.round((1 - sizeBytes / file.size) * 100)}%`,
          dims: `${width}×${height}`,
        });

        if (newSlots.length >= MAX_IMAGES) break; // stop if max reached
      } catch (err) {
        newErrors.push(`${file.name}: ${err.message}`);
      }
    }

    setSlots(newSlots);
    setErrors(newErrors);
    setCompressionInfo(newInfo);
    setUploadDone(false);
  }

  function removeSlot(index) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setCompressionInfo((prev) => prev.filter((_, i) => i !== index));
    setUploadDone(false);
  }

  async function handleUpload() {
    if (slots.length === 0) {
      setErrors(['Please select at least 1 image']);
      return;
    }
    if (!inspectionId) {
      setErrors(['Cannot upload — inspection not started yet']);
      return;
    }

    setUploading(true);
    setErrors([]);

    // Mark all as uploading
    setSlots((prev) => prev.map((s) => ({ ...s, status: 'uploading' })));

    try {
      // Burn lat/long, inspection ID and timestamp watermark onto each image before uploading
      const now = new Date();
      const timestamp = now.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      const images = await Promise.all(
        slots.map(async (s) => {
          const finalDataUrl = latLong?.trim()
            ? await burnLatLong(s.dataUrl, latLong.trim(), inspectionId, timestamp)
            : s.dataUrl;
          return { dataUrl: finalDataUrl, label: s.label };
        })
      );

      const res  = await fetch('/api/inspection/upload-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_id: inspectionId, vehicle_number: vehicleNumber || '', images }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Mark uploaded slots as done, attach hosted image URLs
      setSlots((prev) =>
        prev.map((s, i) => {
          const match = data.uploaded.find((u) => u.index === i + 1);
          return match ? { ...s, status: 'done', ...match } : { ...s, status: 'error' };
        })
      );

      if (data.errors && data.errors.length > 0) setErrors(data.errors);
      setUploadDone(true);

      // Notify parent with hosted image URLs
      onUploadComplete && onUploadComplete(data.uploaded);
    } catch (err) {
      setErrors([err.message]);
      setSlots((prev) => prev.map((s) => ({ ...s, status: 'error' })));
    } finally {
      setUploading(false);
    }
  }

  const remaining = MAX_IMAGES - slots.length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="form-label mb-0">
          📸 Vehicle Photos
          <span className="text-gray-400 font-normal ml-1">(up to {MAX_IMAGES})</span>
        </label>
        {slots.length > 0 && (
          <span className="text-xs text-gray-400">{slots.length}/{MAX_IMAGES}</span>
        )}
      </div>

      {/* Compression info badge */}
      <div className="text-xs text-gray-400 mb-3 bg-gray-50 rounded-lg px-3 py-1.5">
        📦 Images auto-compressed to {Math.round(COMPRESS_CONFIG.quality * 100)}% quality,
        max {COMPRESS_CONFIG.maxWidthPx}px wide — saves storage & speeds upload
      </div>

      {/* Photo guide — show until all slots are filled */}
      {slots.length < MAX_IMAGES && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3 mb-3">
          <p className="text-xs font-bold text-blue-700 mb-2">📸 Required Photos ({slots.length}/{MAX_IMAGES})</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Front',      icon: '⬆️', done: slots.length >= 1 },
              { label: 'Rear',       icon: '⬇️', done: slots.length >= 2 },
              { label: 'Left Side',  icon: '⬅️', done: slots.length >= 3 },
              { label: 'Right Side', icon: '➡️', done: slots.length >= 4 },
            ].map((shot) => (
              <div key={shot.label} className={`flex flex-col items-center rounded-xl py-2 gap-1 border ${ shot.done ? 'bg-green-50 border-green-200' : 'bg-white border-blue-200'}`}>
                <span className="text-lg">{shot.done ? '✅' : shot.icon}</span>
                <span className={`text-xs font-semibold ${shot.done ? 'text-green-600' : 'text-blue-600'}`}>{shot.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {Array.from({ length: MAX_IMAGES }).map((_, i) => (
          <ImageSlot
            key={i}
            slot={slots[i] || null}
            index={i}
            onRemove={removeSlot}
          />
        ))}
      </div>

      {/* Compression stats */}
      {compressionInfo.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 mb-3 space-y-1">
          <p className="text-xs font-semibold text-blue-700 mb-1">Compression Results:</p>
          {compressionInfo.map((info, i) => (
            <div key={i} className="flex justify-between text-xs text-blue-600">
              <span>{info.label}</span>
              <span>{info.original} → {info.compressed} ({info.dims}, saved {info.saved})</span>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600">⚠️ {e}</p>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {remaining > 0 && !uploadDone && (
        <div className="flex gap-2 mb-3">
          {/* Gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 border-2 border-blue-300 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            🖼️ Gallery
          </button>
          {/* Camera */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 py-3 border-2 border-green-300 rounded-xl text-sm font-semibold text-green-700 bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            📷 Camera
          </button>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"   // rear camera
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Upload button */}
      {slots.length > 0 && !uploadDone && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading images...</>
            : `☁️ Upload ${slots.length} Image${slots.length > 1 ? 's' : ''}`
          }
        </button>
      )}

      {/* Done state */}
      {uploadDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold text-center">
          ✅ {slots.filter(s => s.status === 'done').length} image{slots.filter(s => s.status === 'done').length > 1 ? 's' : ''} uploaded
          <button
            type="button"
            onClick={() => { setSlots([]); setUploadDone(false); setCompressionInfo([]); }}
            className="block mx-auto mt-1 text-xs text-green-600 underline font-normal"
          >
            Replace images
          </button>
        </div>
      )}
    </div>
  );
}
