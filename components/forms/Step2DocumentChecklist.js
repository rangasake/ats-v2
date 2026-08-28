import { useState, useEffect } from 'react';
import { DOC_CHECKLIST_ITEMS, INSURANCE_COMPANIES, TEST_TYPES, VEHICLE_LANES, LANE_TYPES } from '../../lib/constants';
import YesNoField from '../ui/YesNoField';
import SearchableDropdown from '../ui/SearchableDropdown';
import DateInput from '../ui/DateInput';

const EXPIRY_FIELDS = ['last_rc', 'puc', 'insurance'];

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

function withNextExpiries(formData, registrationDateStr) {
  const extras = {};
  EXPIRY_FIELDS.forEach((id) => {
    const expiry = formData[`${id}_expiry`];
    if (expiry) extras[`${id}_next_expiry`] = computeNextExpiry(expiry, registrationDateStr);
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

function normalizeDateForInput(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return str;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export default function Step2DocumentChecklist({ data, onSave, loading }) {
  const [vehicleNumber, setVehicleNumber] = useState(data?.vehicle_number || '');
  const [searchDone, setSearchDone] = useState(!!data?.vehicle_number);
  const [searching, setSearching] = useState(false);
  const [noVehicleFound, setNoVehicleFound] = useState(false);

  const [vehicleLane, setVehicleLane] = useState(data?.vehicle_lane || '');
  const [laneType, setLaneType] = useState(data?.lane_type || '');
  const [laneErrors, setLaneErrors] = useState({});

  const [laneConfig, setLaneConfig] = useState({ doc_hidden: [] });
  const [insuranceCompanies, setInsuranceCompanies] = useState(INSURANCE_COMPANIES);
  const [insuranceLoading, setInsuranceLoading] = useState(true);

  const [form, setForm] = useState(() =>
    withNextExpiries({
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
    }, data?.registration_date)
  );

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetch('/api/insurance/list')
      .then((r) => r.json())
      .then((d) => { if (d.companies && d.companies.length > 0) setInsuranceCompanies(d.companies); })
      .catch(() => {})
      .finally(() => setInsuranceLoading(false));
  }, []);

  useEffect(() => {
    if (!laneType) return;
    fetch('/api/admin/lane-config')
      .then((r) => r.json())
      .then((d) => {
        const cfg = (d.configs || []).find((c) => c.lane_type === laneType);
        setLaneConfig({
          doc_hidden: cfg ? tryParse(cfg.doc_hidden_items, []) : [],
        });
      })
      .catch(() => {});
  }, [laneType]);

  const visibleItems = DOC_CHECKLIST_ITEMS.filter((item) => shouldShowItem(item, laneType, laneConfig.doc_hidden));

  const todayStr = new Date().toISOString().slice(0, 10);
  const minDateStr = (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })();

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function setExpiry(itemId, value) {
    const nextExpiry = computeNextExpiry(value, data?.registration_date);
    setForm((prev) => ({
      ...prev,
      [`${itemId}_expiry`]: value,
      [`${itemId}_next_expiry`]: nextExpiry,
    }));
  }

  async function searchVehicle() {
    const vn = vehicleNumber.trim().toUpperCase();
    if (!vn) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/vehicle/search?vehicle_number=${encodeURIComponent(vn)}`);
      const json = await res.json();
      if (json.found) {
        setVehicleLane(json.vehicle.vehicle_lane || '');
        setLaneType(json.vehicle.lane_type || '');
        setNoVehicleFound(false);
        setSearchDone(true);
      } else {
        setNoVehicleFound(true);
        setSearchDone(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  function handleSave() {
    const errs = {};
    const laneErrs = {};
    if (!vehicleNumber.trim()) errs._vehicle = 'Vehicle number is required';
    if (!vehicleLane) laneErrs.vehicle_lane = 'Required';
    if (!laneType) laneErrs.lane_type = 'Required';
    if (!form.test_date) errs.test_date = 'Test Date is required';
    if (!form.test_type) errs.test_type = 'Test Type is required';

    if (Object.keys(laneErrs).length > 0) {
      setLaneErrors(laneErrs);
    }
    if (Object.keys(errs).length > 0 || Object.keys(laneErrs).length > 0) {
      setErrors(errs);
      return;
    }

    onSave({
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      vehicle_lane: vehicleLane,
      lane_type: laneType,
      ...form,
    });
  }

  return (
    <div>
      {/* Vehicle Search */}
      <div className="card mb-4">
        <h2 className="section-title">🔍 Vehicle Search</h2>
        {noVehicleFound && (
          <p className="text-red-500 text-xs my-2">
            Vehicle not found in database. Lane details can still be selected below.
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Vehicle Number (e.g. AP02AB1234)"
            value={vehicleNumber}
            onChange={(e) => { setVehicleNumber(e.target.value.toUpperCase()); setNoVehicleFound(false); }}
            onKeyDown={(e) => e.key === 'Enter' && searchVehicle()}
            className="form-input uppercase"
            disabled={searchDone}
          />
          {!searchDone ? (
            <button
              type="button"
              onClick={searchVehicle}
              disabled={searching || !vehicleNumber}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm whitespace-nowrap disabled:opacity-50 active:scale-95"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setSearchDone(false); setVehicleNumber(''); setNoVehicleFound(false); setVehicleLane(''); setLaneType(''); }}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm whitespace-nowrap active:scale-95"
            >
              Clear
            </button>
          )}
        </div>
        {errors._vehicle && <p className="text-red-500 text-xs mt-1">{errors._vehicle}</p>}
      </div>

      {/* Lane Information */}
      {searchDone && (
        <div className="card mb-4">
          <h2 className="section-title">🛣️ Lane Information</h2>
          <div className="mb-4">
            <label className="form-label">
              Vehicle Lane <span className="text-red-500">*</span>
            </label>
            <select
              value={vehicleLane}
              onChange={(e) => { setVehicleLane(e.target.value); setLaneErrors((prev) => ({ ...prev, vehicle_lane: '' })); }}
              className="form-input"
            >
              <option value="">Select Lane</option>
              {VEHICLE_LANES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {laneErrors.vehicle_lane && <p className="text-red-500 text-xs mt-1">{laneErrors.vehicle_lane}</p>}
          </div>
          <div className="mb-0">
            <SearchableDropdown
              label="Vehicle Lane Type"
              options={LANE_TYPES}
              value={laneType}
              onChange={(v) => { setLaneType(v); setLaneErrors((prev) => ({ ...prev, lane_type: '' })); }}
              placeholder="Select Lane Type"
              required
            />
            {laneErrors.lane_type && <p className="text-red-500 text-xs mt-1">{laneErrors.lane_type}</p>}
          </div>
        </div>
      )}

      {/* Document Checklist */}
      {searchDone && (
        <div className="card mb-4">
          <h2 className="section-title">📄 Document Checklist</h2>
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
            Vehicle <strong>{vehicleNumber}</strong> | Lane type: <strong>{laneType || '—'}</strong>
          </p>

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
      )}

      {searchDone && (
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="btn-primary mt-2"
        >
          {loading ? 'Saving...' : 'Save & Continue →'}
        </button>
      )}
    </div>
  );
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
