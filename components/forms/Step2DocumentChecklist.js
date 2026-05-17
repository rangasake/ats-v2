import { useState, useEffect } from 'react';
import { DOC_CHECKLIST_ITEMS, INSURANCE_COMPANIES, TEST_TYPES } from '../../lib/constants';
import YesNoField from '../ui/YesNoField';
import SearchableDropdown from '../ui/SearchableDropdown';
import DateInput from '../ui/DateInput';

// Fields that carry an expiry date and need the next-expiry calculation
const EXPIRY_FIELDS = ['last_rc', 'puc', 'insurance'];

/**
 * Calculates the next expiry date based on the rules:
 *   base_date = (currentExpiry <= today) ? today : currentExpiry
 *   years_to_add = (vehicleAge < 8 years) ? 2 : 1
 *   next_expiry = base_date + years_to_add
 */
function computeNextExpiry(currentExpiryStr, registrationDateStr) {
  if (!currentExpiryStr) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentExpiry = new Date(currentExpiryStr);
  if (isNaN(currentExpiry.getTime())) return '';

  const baseDate = currentExpiry <= today ? new Date(today) : new Date(currentExpiry);

  const regDate = registrationDateStr ? new Date(registrationDateStr) : null;
  const ageYears =
    regDate && !isNaN(regDate.getTime())
      ? (today - regDate) / (1000 * 60 * 60 * 24 * 365.25)
      : 0;

  const yearsToAdd = ageYears < 8 ? 2 : 1;
  baseDate.setFullYear(baseDate.getFullYear() + yearsToAdd);

  return baseDate.toISOString().split('T')[0];
}

/** Pre-compute all next-expiry fields from saved data at initialisation time */
function withNextExpiries(formData, registrationDateStr) {
  const extras = {};
  EXPIRY_FIELDS.forEach((id) => {
    const expiry = formData[`${id}_expiry`];
    if (expiry) {
      extras[`${id}_next_expiry`] = computeNextExpiry(expiry, registrationDateStr);
    }
  });
  return { ...formData, ...extras };
}

function shouldShowItem(item, laneType, hiddenItems = []) {
  if (hiddenItems.includes(item.id)) return false;
  if (item.alwaysShow) return true;
  if (item.onlyFor && !item.onlyFor.includes(laneType)) return false;
  if (item.notFor && item.notFor.includes(laneType)) return false;
  return true;
}

export default function Step2DocumentChecklist({ data, vehicleNumber, laneType, registrationDate, hiddenItems = [], onSave, onBack, loading }) {
  const [form, setForm] = useState(() =>
    withNextExpiries(
      {
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
      },
      registrationDate
    )
  );

  // Fetch insurance companies from Google Sheets (falls back to constants if empty/error)
  const [insuranceCompanies, setInsuranceCompanies] = useState(INSURANCE_COMPANIES);
  const [insuranceLoading, setInsuranceLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insurance/list')
      .then((r) => r.json())
      .then((d) => {
        if (d.companies && d.companies.length > 0) {
          setInsuranceCompanies(d.companies);
        }
      })
      .catch(() => {/* keep fallback */})
      .finally(() => setInsuranceLoading(false));
  }, []);

  const visibleItems = DOC_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, hiddenItems));

  const [errors, setErrors] = useState({});

  // Restrict test_date to today and 2 days back
  const todayStr = new Date().toISOString().slice(0, 10);
  const minDateStr = (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })();

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  /** When an expiry date changes, also recompute the next-expiry for that document */
  function setExpiry(itemId, value) {
    const nextExpiry = computeNextExpiry(value, registrationDate);
    setForm((prev) => ({
      ...prev,
      [`${itemId}_expiry`]: value,
      [`${itemId}_next_expiry`]: nextExpiry,
    }));
  }

  function handleSave() {
    const errs = {};
    if (!form.test_date) errs.test_date = 'Test Date is required';
    if (!form.test_type) errs.test_type = 'Test Type is required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave(form);
  }

  return (
    <div>
      <div className="card mb-4">
        <h2 className="section-title">📄 Document Checklist</h2>
                {vehicleNumber && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
        
        Vehicle number <strong>{vehicleNumber} </strong> |  Lane type: <strong>{laneType}</strong> 
        </p>
 )}

        {visibleItems.map((item) => {
          if (item.type === 'date_only') {
            const isTestDate = item.id === 'test_date';
            return (
              <div key={item.id} className="mb-4">
                <label className="form-label">{item.label} <span className="text-red-500">*</span></label>
                <DateInput
                  value={form[item.id] || ''}
                  onChange={(e) => set(item.id, e.target.value)}
                  className={`form-input${errors[item.id] ? ' border-red-400' : ''}`}
                  min={isTestDate ? minDateStr : undefined}
                  max={isTestDate ? todayStr : undefined}
                />
                {errors[item.id] && <p className="text-red-500 text-xs mt-1">{errors[item.id]}</p>}
              </div>
            );
          }
          if (item.type === 'dropdown') {
            return (
              <div key={item.id} className="mb-4">
                <label className="form-label">{item.label} <span className="text-red-500">*</span></label>
                <select value={form[item.id] || ''} onChange={(e) => set(item.id, e.target.value)} className={`form-input${errors[item.id] ? ' border-red-400' : ''}`}>
                  <option value="">Select...</option>
                  {item.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors[item.id] && <p className="text-red-500 text-xs mt-1">{errors[item.id]}</p>}
              </div>
            );
          }
          if (item.type === 'dropdown_search') {
            return (
              <SearchableDropdown
                key={item.id}
                label={item.label}
                options={insuranceCompanies}
                value={form[item.id]}
                onChange={(v) => set(item.id, v)}
                placeholder={insuranceLoading ? 'Loading companies...' : 'Select company...'}
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
            const nextExpiry = form[`${item.id}_next_expiry`];
            return (
              <div key={item.id}>
                <YesNoField
                  label={item.label}
                  value={form[item.id]}
                  onChange={(v) => set(item.id, v)}
                  dateValue={form[`${item.id}_expiry`]}
                  onDateChange={(v) => setExpiry(item.id, v)}
                  dateLabel={item.dateLabel}
                />
                {nextExpiry && (
                  <div className="flex items-center gap-2 -mt-2 mb-4 ml-1">
                    <span className="text-xs text-gray-500">Next Expiry:</span>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-0.5">
                      {new Date(nextExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
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
