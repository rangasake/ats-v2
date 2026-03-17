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

// ── CHANGED: added inspectionId prop ──────────────────────────
export default function Step3VisualChecklist({ data, laneType, hiddenItems = [], inspectionId, vehicleData, onSave, onBack, loading }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    VISUAL_CHECKLIST_ITEMS.forEach((item) => { initial[item.id] = ''; });
    return { ...initial, ...(data || {}) };
  });

  // ── NEW: store Drive URLs returned from ImageUploader ────────
  const [uploadedImages, setUploadedImages] = useState(
    data?.uploaded_images ? JSON.parse(data.uploaded_images) : []
  );
  const [imageError, setImageError] = useState('');

  const visibleItems = VISUAL_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, hiddenItems));
  const categories   = [...new Set(visibleItems.map((i) => i.category))];

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Called by ImageUploader after successful Drive upload
  function handleUploadComplete(uploaded) {
    setUploadedImages(uploaded);
    setImageError('');
  }

  function handleSave() {
    // ── VALIDATION: require at least 1 uploaded image ────────
    if (uploadedImages.length === 0) {
      setImageError('Please upload at least 1 vehicle photo before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setImageError('');
    // Pass visual checklist data + serialised image URLs to parent
    onSave({
      ...form,
      uploaded_images: JSON.stringify(uploadedImages),  // stored in Inspections sheet
    });
  }

  return (
    <div>
      <div className="card mb-4">
        <h2 className="section-title">🔍 Visual Test Checklist</h2>
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
        Vehicle number <strong>{vehicleData.vehicle_number} </strong> |  Lane type: <strong>{laneType}</strong> 
        </p>

        {/* ── NEW: Image upload section ── */}
        <ImageUploader
          inspectionId={inspectionId}
          vehicleNumber={vehicleData.vehicle_number}
          onUploadComplete={handleUploadComplete}
          existingUrls={uploadedImages}
        />

        {imageError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠️ {imageError}
          </div>
        )}

        <div className="border-t border-gray-200 my-4" />

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