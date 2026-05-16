import { useState } from "react";
import {
  MANDALS,
  MANDAL_RTO_MAP,
  VEHICLE_LANES,
  LANE_TYPES,
} from "../../lib/constants";
import SearchableDropdown from "../ui/SearchableDropdown";
import DateInput from "../ui/DateInput";

function normalizeDateForInput(value) {
  if (!value) return "";

  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return str;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export default function Step1CommonData({ data, onSave, loading }) {
  const [form, setForm] = useState({
    vehicle_number: "",
    engine_number: "",
    chassis_number: "",
    meter_reading: "",
    owner_name: "",
    owner_phone: "",
    mandal_name: "",
    rto_office: "",
    vehicle_lane: "",
    lane_type: "",
    registration_date: "",
    ...data,
    registration_date: normalizeDateForInput(data?.registration_date),
  });
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(!!data?.vehicle_number);
  const [errors, setErrors] = useState({});
  const [noVehicleFound, setNoVehicleFound] = useState(false);
  const [otherMandal, setOtherMandal] = useState(
    data?.mandal_name && !MANDALS.includes(data.mandal_name) ? data.mandal_name : ''
  );

  function set(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "mandal_name") {
        next.rto_office = MANDAL_RTO_MAP[value] || "";
      }
      return next;
    });
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function searchVehicle() {
    const vn = form.vehicle_number.trim().toUpperCase();
    if (!vn) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/vehicle/search?vehicle_number=${encodeURIComponent(vn)}`,
      );
      const json = await res.json();
      if (json.found) {
        setForm((prev) => ({
          ...prev,
          ...json.vehicle,
          registration_date: normalizeDateForInput(json.vehicle?.registration_date),
        }));
      } else {
        setNoVehicleFound(true);
      }
      setSearchDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  function validate() {
    const err = {};
    if (!form.vehicle_number) err.vehicle_number = "Required";
    if (!form.engine_number) err.engine_number = "Required";
    if (!form.chassis_number) err.chassis_number = "Required";
    if (!form.owner_name) err.owner_name = "Required";
    if (!form.owner_phone) err.owner_phone = "Required";
    if (!form.mandal_name) err.mandal_name = "Required";
    if (form.mandal_name === 'OTHER' && !otherMandal.trim()) err.mandal_name = "Please enter the mandal name";
    if (!form.vehicle_lane) err.vehicle_lane = "Required";
    if (!form.lane_type) err.lane_type = "Required";
    if (!form.registration_date) err.registration_date = "Required";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  function handleSave() {
    if (validate()) {
      const finalForm = form.mandal_name === 'OTHER'
        ? { ...form, mandal_name: otherMandal.trim(), rto_office: otherMandal.trim() }
        : form;
      onSave(finalForm);
    }
  }

  return (
    <div>
      {/* Vehicle Search */}
      <div className="card mb-4">
        <h2 className="section-title">🔍 Vehicle Search</h2>

        {noVehicleFound && (
          <p className="text-red-500 text-xs my-4">
            Vehicle number not avaliable in database enter vehicle
            deatils as per original documents{" "}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Vehicle Number (e.g. AP02AB1234)"
            value={form.vehicle_number}
            onChange={(e) =>
              set("vehicle_number", e.target.value.toUpperCase())
            }
            onKeyDown={(e) => e.key === "Enter" && searchVehicle()}
            className="form-input uppercase"
            disabled={searchDone}
          />
          {!searchDone ? (
            <button
              type="button"
              onClick={searchVehicle}
              disabled={searching || !form.vehicle_number}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm whitespace-nowrap disabled:opacity-50 active:scale-95"
            >
              {searching ? "Searching" : "Search"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchDone(false);
                setForm((p) => ({ ...p, vehicle_number: "" }));
                 setNoVehicleFound(false);
              }}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm whitespace-nowrap active:scale-95"
            >
              Clear
            </button>
          )}
        </div>
        {errors.vehicle_number && (
          <p className="text-red-500 text-xs mt-1">{errors.vehicle_number}</p>
        )}
      </div>

      {searchDone && (
        <>
          {/* Vehicle Details */}
          <div className="card mb-4">
            <h2 className="section-title">🚗 Vehicle Details</h2>
            <Field
              label="Engine Number"
              value={form.engine_number}
              onChange={(v) => set("engine_number", v)}
              error={errors.engine_number}
              required
            />
            <Field
              label="Chassis Number"
              value={form.chassis_number}
              onChange={(v) => set("chassis_number", v)}
              error={errors.chassis_number}
              required
            />
            <Field
              label="Meter Reading"
              value={form.meter_reading}
              onChange={(v) => set("meter_reading", v)}
              placeholder="Meter reading KM"
              type="number"
            />
            <div className="mb-4">
              <label className="form-label">
                Registration Date <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.registration_date}
                onChange={(e) => set("registration_date", e.target.value)}
                className="form-input"
              />
              {errors.registration_date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.registration_date}
                </p>
              )}
            </div>
          </div>

          {/* Owner Details */}
          <div className="card mb-4">
            <h2 className="section-title">👤 Owner Details</h2>
            <Field
              label="Owner Name"
              value={form.owner_name}
              onChange={(v) => set("owner_name", v)}
              error={errors.owner_name}
              required
            />
            <div className="mb-4">
              <label className="form-label">
                Owner Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.owner_phone}
                onChange={(e) => set("owner_phone", e.target.value)}
                className="form-input"
                maxLength={10}
              />
              {errors.owner_phone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.owner_phone}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="form-label">
                Mandal Name <span className="text-red-500">*</span>
              </label>
              <select
                value={MANDALS.includes(form.mandal_name) ? form.mandal_name : (form.mandal_name ? 'OTHER' : '')}
                onChange={(e) => {
                  if (e.target.value === 'OTHER') {
                    set('mandal_name', 'OTHER');
                  } else {
                    setOtherMandal('');
                    set('mandal_name', e.target.value);
                  }
                }}
                className="form-input"
              >
                <option value="">Select Mandal</option>
                {MANDALS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="OTHER">Other</option>
              </select>
              {(form.mandal_name === 'OTHER' || (form.mandal_name && !MANDALS.includes(form.mandal_name))) && (
                <div className="mt-2">
                  <label className="form-label">Other RTO Office Mandal Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter RTO Office Mandal name"
                    value={otherMandal}
                    onChange={(e) => { setOtherMandal(e.target.value); setErrors((err) => ({ ...err, mandal_name: '' })); }}
                    className="form-input"
                  />
                </div>
              )}
              {errors.mandal_name && (
                <p className="text-red-500 text-xs mt-1">{errors.mandal_name}</p>
              )}
            </div>
            {form.mandal_name !== 'OTHER' && (
            <div className="mb-4">
              <label className="form-label">RTO Office</label>
              <input
                type="text"
                value={form.rto_office}
                readOnly
                className="form-input bg-gray-50 text-gray-500"
                placeholder="Auto-filled from Mandal"
              />
            </div>
            )}
          </div>

          {/* Lane Info */}
          <div className="card mb-4">
            <h2 className="section-title">🛣️ Lane Information</h2>
            <div className="mb-4">
              <label className="form-label">
                Vehicle Lane <span className="text-red-500">*</span>
              </label>
              <select
                value={form.vehicle_lane}
                onChange={(e) => set("vehicle_lane", e.target.value)}
                className="form-input"
              >
                <option value="">Select Lane</option>
                {VEHICLE_LANES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {errors.vehicle_lane && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.vehicle_lane}
                </p>
              )}
            </div>
            <SearchableDropdown
              label="Vehicle Lane Type"
              options={LANE_TYPES}
              value={form.lane_type}
              onChange={(v) => set("lane_type", v)}
              placeholder="Select Lane Type"
              required
            />
            {errors.lane_type && (
              <p className="text-red-500 text-xs mt-1">{errors.lane_type}</p>
            )}
          </div>
        </>
      )}

      {searchDone && (
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="btn-primary mt-2"
        >
          {loading ? "Saving..." : "Save & Continue →"}
        </button>
      )}
    </div>
  );
}

function Field({ label, value, onChange, error, required, type = "text", placeholder = "" }) {
  return (
    <div className="mb-4">
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
        placeholder={placeholder}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
