import { useState, useEffect } from 'react';
import { DOC_CHECKLIST_ITEMS, TEST_TYPES, INSURANCE_COMPANIES } from '../../lib/constants';
import SearchableDropdown from '../ui/SearchableDropdown';
import DateInput from '../ui/DateInput';
import YesNoField from '../ui/YesNoField';

const EXPIRY_FIELDS = ['last_rc', 'puc', 'insurance'];

function computeFcExpiryYears(registrationDateStr) {
  const regDate = registrationDateStr ? new Date(registrationDateStr) : null;
  const today = new Date();
  if (regDate && !isNaN(regDate.getTime())) {
    const ageYears = (today - regDate) / (1000 * 60 * 60 * 24 * 365.25);
    return ageYears < 8 ? 2 : 1;
  }
  return 2;
}

function computeNextExpiry(currentExpiryStr, registrationDateStr) {
  if (!currentExpiryStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentExpiry = new Date(currentExpiryStr);
  if (isNaN(currentExpiry.getTime())) return '';
  const baseDate = currentExpiry <= today ? new Date(today) : new Date(currentExpiry);
  const regDate = registrationDateStr ? new Date(registrationDateStr) : null;
  const ageYears = regDate && !isNaN(regDate.getTime())
    ? (today - regDate) / (1000 * 60 * 60 * 24 * 365.25)
    : 0;
  const yearsToAdd = ageYears < 8 ? 2 : 1;
  baseDate.setFullYear(baseDate.getFullYear() + yearsToAdd);
  return baseDate.toISOString().split('T')[0];
}

const BASE_FORM = {
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
  fc_expiry: '',
};

function shouldShowItem(item, laneType, hiddenItems = []) {
  if (hiddenItems.includes(item.id)) return false;
  if (item.alwaysShow) return true;
  if (item.onlyFor && !item.onlyFor.includes(laneType)) return false;
  if (item.notFor && item.notFor.includes(laneType)) return false;
  return true;
}

export default function DocumentChecklist({ data, laneType, docHidden = [], registrationDate, onSave, onBack, loading }) {
  const [form, setForm] = useState({ ...BASE_FORM, ...(data || {}) });
  const [nextExpiries, setNextExpiries] = useState({});
  const [errors, setErrors] = useState({});
  const [insuranceCompanies, setInsuranceCompanies] = useState(INSURANCE_COMPANIES);

  useEffect(() => {
    fetch('/api/insurance/list')
      .then((r) => r.json())
      .then((d) => { if (d.companies && d.companies.length > 0) setInsuranceCompanies(d.companies); })
      .catch(() => {});
  }, []);

  const visibleItems = DOC_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, docHidden));

  function set(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (EXPIRY_FIELDS.some((id) => `${id}_expiry` === field)) {
        const nextExpiry = computeNextExpiry(value, registrationDate);
        setNextExpiries((p) => ({ ...p, [`${field.replace(/_expiry$/, '')}_next_expiry`]: nextExpiry }));
        if (field === 'last_rc_expiry') {
          next.fc_expiry = value ? String(computeFcExpiryYears(registrationDate)) : '';
        }
      }
      return next;
    });
  }

  function handleSave() {
    const errs = {};
    if (!form.test_date) errs.test_date = 'Required';
    if (!form.test_type) errs.test_type = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave(form);
  }

  return (
    <div>
      <div className="card mb-4">
        <h2 className="section-title">📄 Document Checklist</h2>
        <p className="text-xs text-gray-400 mb-4">
          Verify and record all submitted documents for this vehicle.
        </p>

        {visibleItems.map((item) => {
          if (item.type === 'date_only') {
            return (
              <div className="mb-4" key={item.id}>
                <label className="form-label">Test Date <span className="text-red-500">*</span></label>
                <DateInput
                  value={form.test_date}
                  onChange={(e) => { set('test_date', e.target.value); setErrors((p) => ({ ...p, test_date: '' })); }}
                  className="form-input"
                />
                {errors.test_date && <p className="text-red-500 text-xs mt-1">{errors.test_date}</p>}
              </div>
            );
          }

          if (item.type === 'dropdown') {
            return (
              <div className="mb-4" key={item.id}>
                <label className="form-label">Test Type <span className="text-red-500">*</span></label>
                <select
                  value={form.test_type}
                  onChange={(e) => { set('test_type', e.target.value); setErrors((p) => ({ ...p, test_type: '' })); }}
                  className="form-input"
                >
                  <option value="">Select...</option>
                  {TEST_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.test_type && <p className="text-red-500 text-xs mt-1">{errors.test_type}</p>}
              </div>
            );
          }

          if (item.type === 'checkbox_date') {
            const expiryField = `${item.id}_expiry`;
            return (
              <div key={item.id}>
                <YesNoField
                  label={item.label}
                  value={form[item.id]}
                  onChange={(v) => set(item.id, v)}
                  dateValue={form[expiryField]}
                  onDateChange={(v) => set(expiryField, v)}
                  dateLabel={item.dateLabel || 'Expiry Date'}
                />
                <NextExpiryBadge
                  nextExpiry={nextExpiries[`${item.id}_next_expiry`]}
                  years={item.id === 'last_rc' ? form.fc_expiry : ''}
                />
              </div>
            );
          }

          if (item.type === 'dropdown_search') {
            return (
              <div className="mb-4" key={item.id}>
                <SearchableDropdown
                  label={item.label}
                  options={insuranceCompanies}
                  value={form.insurance_company}
                  onChange={(v) => set('insurance_company', v)}
                  placeholder="Select company..."
                />
              </div>
            );
          }

          // checkbox
          return (
            <YesNoField
              key={item.id}
              label={item.label}
              value={form[item.id]}
              onChange={(v) => set(item.id, v)}
            />
          );
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

function NextExpiryBadge({ nextExpiry, years }) {
  if (!nextExpiry) return null;
  return (
    <div className="flex items-center gap-2 -mt-2 mb-4 ml-1 flex-wrap">
      <span className="text-xs text-gray-500">Next Expiry:</span>
      <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-0.5">
        {new Date(nextExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
      {years && (
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5">
          FC valid for {years} {years === '1' ? 'Year' : 'Years'}
        </span>
      )}
    </div>
  );
}