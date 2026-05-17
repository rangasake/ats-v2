// components/forms/Step3VisualChecklist.js  ← UPDATED
import { useState } from 'react';
import { VISUAL_CHECKLIST_ITEMS } from '../../lib/constants';
import YesNoField from '../ui/YesNoField';
import ImageUploader from '../ui/ImageUploader';  // ← NEW

function shouldShowItem(item, laneType, hiddenItems = []) {
  if (hiddenItems.includes(item.id)) return false;
  if (item.alwaysShow) return true;
  if (item.onlyFor && !item.onlyFor.includes(laneType)) return false;
  if (item.notFor && item.notFor.includes(laneType)) return false;
  return true;
}

function safeParseImages(str) {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── CHANGED: added inspectionId prop ──────────────────────────
export default function Step3VisualChecklist({ data, laneType, hiddenItems = [], inspectionId, vehicleNumber, onSave, onBack, loading }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    VISUAL_CHECKLIST_ITEMS.forEach((item) => { initial[item.id] = ''; });
    return { ...initial, ...(data || {}) };
  });

  // ── NEW: store hosted image URLs returned from ImageUploader ────────
  const [uploadedImages, setUploadedImages] = useState(
    data?.uploaded_images ? safeParseImages(data.uploaded_images) : []
  );
  const [imageError, setImageError] = useState('');
  const [latLong, setLatLong] = useState(data?.lat_long || '');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const visibleItems = VISUAL_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, hiddenItems));
  const categories   = [...new Set(visibleItems.map((i) => i.category))];

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Called by ImageUploader after successful image upload.
  // Also auto-saves URLs to the inspection sheet immediately so they survive a refresh.
  async function handleUploadComplete(uploaded) {
    setUploadedImages(uploaded);
    setImageError('');

    if (!inspectionId) return;
    try {
      const imageUrlsFlat = uploaded.map((img) => img.directUrl).filter(Boolean).join(', ');
      await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No 'step' field — keeps the sheet step counter unchanged so resume
        // correctly lands back on step 3 instead of skipping to step 4.
        body: JSON.stringify({
          inspection_id:   inspectionId,
          image_urls:      imageUrlsFlat,
          image_urls_json: JSON.stringify(uploaded),
        }),
      });
    } catch {
      // Non-fatal: images are safe on Cloudinary; user can still proceed normally.
    }
  }

  function handlePinLocation() {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Location is not supported on this device.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLatLong(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(error.message || 'Could not capture location.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function handleSave() {
    // ── VALIDATION: require at least 1 uploaded image ────────
    if (uploadedImages.length === 0) {
      setImageError('Please upload at least 1 vehicle photo before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!latLong) {
      setLocationError('Please pin the vehicle location before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setImageError('');
    setLocationError('');
    // Pass visual checklist data + serialised image URLs to parent
    onSave({
      ...form,
      lat_long: latLong,
      uploaded_images: JSON.stringify(uploadedImages),  // stored in Inspections sheet
    });
  }

  return (
    <div>
      <div className="card mb-4">
        <h2 className="section-title">🔍 Visual Test Checklist</h2>
          {vehicleNumber && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
        
        Vehicle number <strong>{vehicleNumber} </strong> |  Lane type: <strong>{laneType}</strong> 
        </p>
 )}
        {/* ── Step 1: Pin Location first ── */}
        <div className="mb-4">
          <label className="form-label">
            Vehicle Location <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handlePinLocation}
            disabled={locationLoading}
            className="w-full py-3 border-2 border-blue-300 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 active:scale-95 transition-all disabled:opacity-50"
          >
            {locationLoading ? 'Capturing Location...' : latLong ? '📍 Re-pin Location' : '📍 Pin Location'}
          </button>
          {latLong && (
            <div className="mt-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              <div className="font-semibold">✅ Location Pinned</div>
              <div className="font-mono text-xs mt-1">{latLong}</div>
            </div>
          )}
          {locationError && (
            <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              ⚠️ {locationError}
            </div>
          )}
        </div>

        {/* ── Step 2: Photos — locked until location is pinned ── */}
        {!latLong && (
          <div className="mb-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            📍 Pin your location above to enable photo capture
          </div>
        )}
        {latLong && (
          <ImageUploader
            inspectionId={inspectionId}
            vehicleNumber={vehicleNumber}
            latLong={latLong}
            onUploadComplete={handleUploadComplete}
            existingUrls={uploadedImages}
          />
        )}

        {imageError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠️ {imageError}
          </div>
        )}

        <div className="border-t border-gray-200 my-4" />

        {/* Quick-fill actions */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              const updates = {};
              visibleItems.forEach((item) => { updates[item.id] = 'Yes'; });
              setForm((prev) => ({ ...prev, ...updates }));
            }}
            className="flex-1 py-2.5 rounded-xl border-2 border-green-400 bg-green-50 text-green-700 font-semibold text-sm active:scale-95 transition-all"
          >
            ✅ Mark All as Pass
          </button>
          <button
            type="button"
            onClick={() => {
              const updates = {};
              visibleItems.forEach((item) => { updates[item.id] = ''; });
              setForm((prev) => ({ ...prev, ...updates }));
            }}
            className="px-4 py-2.5 rounded-xl border-2 border-gray-300 bg-gray-50 text-gray-500 font-semibold text-sm active:scale-95 transition-all"
          >
            Clear
          </button>
        </div>

        {/* Existing visual checklist items */}
        {categories.map((cat) => {
          const catItems = visibleItems.filter((i) => i.category === cat);
          return (
            <div key={cat} className="mb-5">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex-1 h-px bg-gray-200" />
                {cat}
                <span className="flex-1 h-px bg-gray-200" />
              </h3>
              {catItems.map((item) => (
                <YesNoField
                  key={item.id}
                  label={item.label}
                  value={form[item.id]}
                  onChange={(v) => set(item.id, v)}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}
