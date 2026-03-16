import { useState, useEffect } from 'react';
import { DOC_CHECKLIST_ITEMS, INSURANCE_COMPANIES, TEST_TYPES } from '../../lib/constants';
import YesNoField from '../ui/YesNoField';
import SearchableDropdown from '../ui/SearchableDropdown';

function shouldShowItem(item, laneType, hiddenItems = []) {
  if (hiddenItems.includes(item.id)) return false;
  if (item.alwaysShow) return true;
  if (item.onlyFor && !item.onlyFor.includes(laneType)) return false;
  if (item.notFor && item.notFor.includes(laneType)) return false;
  return true;
}

export default function Step2DocumentChecklist({ data, laneType, hiddenItems = [], onSave, onBack, loading }) {
  const [form, setForm] = useState({
    test_date: '',
    test_type: '',
    afms_free_receipt: '',
    rc: '',
    last_rc: '',
    last_rc_expiry: '',
    puc: '',
    puc_expiry: '',
    insurance: '',
    insurance_expiry: '',
    insurance_company: '',
    speed_governor: '',
    vlt_device: '',
    ...data,
  });

  const visibleItems = DOC_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, hiddenItems));

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    onSave(form);
  }

  return (
    <div>
      <div className="card mb-4">
        <h2 className="section-title">📄 Document Checklist</h2>
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
          Lane Type: <strong>{laneType}</strong>
        </p>

        {visibleItems.map((item) => {
          if (item.type === 'date_only') {
            return (
              <div key={item.id} className="mb-4">
                <label className="form-label">{item.label} <span className="text-red-500">*</span></label>
                <input type="date" value={form[item.id] || ''} onChange={(e) => set(item.id, e.target.value)} className="form-input" />
              </div>
            );
          }
          if (item.type === 'dropdown') {
            return (
              <div key={item.id} className="mb-4">
                <label className="form-label">{item.label} <span className="text-red-500">*</span></label>
                <select value={form[item.id] || ''} onChange={(e) => set(item.id, e.target.value)} className="form-input">
                  <option value="">Select...</option>
                  {item.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          }
          if (item.type === 'dropdown_search') {
            return (
              <SearchableDropdown
                key={item.id}
                label={item.label}
                options={INSURANCE_COMPANIES}
                value={form[item.id]}
                onChange={(v) => set(item.id, v)}
                placeholder="Select company..."
              />
            );
          }
          if (item.type === 'checkbox') {
            return (
              <YesNoField
                key={item.id}
                label={item.label}
                value={form[item.id]}
                onChange={(v) => set(item.id, v)}
              />
            );
          }
          if (item.type === 'checkbox_date') {
            return (
              <YesNoField
                key={item.id}
                label={item.label}
                value={form[item.id]}
                onChange={(v) => set(item.id, v)}
                dateValue={form[`${item.id}_expiry`]}
                onDateChange={(v) => set(`${item.id}_expiry`, v)}
                dateLabel={item.dateLabel}
              />
            );
          }
          return null;
        })}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button type="button" onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}
