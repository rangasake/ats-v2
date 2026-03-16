import { useState } from 'react';
import { VISUAL_CHECKLIST_ITEMS } from '../../lib/constants';
import YesNoField from '../ui/YesNoField';

function shouldShowItem(item, laneType, hiddenItems = []) {
  if (hiddenItems.includes(item.id)) return false;
  if (item.alwaysShow) return true;
  if (item.onlyFor && !item.onlyFor.includes(laneType)) return false;
  if (item.notFor && item.notFor.includes(laneType)) return false;
  return true;
}

export default function Step3VisualChecklist({ data, laneType, hiddenItems = [], onSave, onBack, loading }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    VISUAL_CHECKLIST_ITEMS.forEach((item) => {
      initial[item.id] = '';
    });
    return { ...initial, ...(data || {}) };
  });

  const visibleItems = VISUAL_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, hiddenItems));

  // Group by category
  const categories = [...new Set(visibleItems.map((i) => i.category))];

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div>
      <div className="card mb-4">
        <h2 className="section-title">🔍 Visual Test Checklist</h2>
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
          Lane Type: <strong>{laneType}</strong>
        </p>

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
          onClick={() => onSave(form)}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}
