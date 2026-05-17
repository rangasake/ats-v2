import { useState } from "react";
import {
  MANDALS,
  MANDAL_RTO_MAP,
  VEHICLE_LANES,
  LANE_TYPES,
} from "../../lib/constants";
import SearchableDropdown from "../ui/SearchableDropdown";
import DateInput from "../ui/DateInput";

// Fields that come from the Vehicles DB record — locked when a vehicle is found
const DB_VEHICLE_FIELDS = [
  'engine_number', 'chassis_number', 'owner_name', 'owner_phone',
  'mandal_name', 'rto_office', 'vehicle_lane', 'lane_type', 'registration_date',
];

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
  // Track which fields came from DB — those are locked (read-only) once populated
  const [dbFields, setDbFields] = useState(() => {
    if (!data?.vehicle_number) return new Set();
    return new Set(DB_VEHICLE_FIELDS.filter((k) => data[k] !== '' && data[k] != null));
  });
  const [vehicleHistory, setVehicleHistory] = useState([]);

  function isLocked(field) { return dbFields.has(field); }

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
        // Lock all non-empty DB fields (meter_reading always stays editable)
        setDbFields(new Set(DB_VEHICLE_FIELDS.filter((k) => json.vehicle[k] !== '' && json.vehicle[k] != null)));
        // Fetch inspection history for this vehicle
        fetch(`/api/vehicle/history?vehicle_number=${encodeURIComponent(vn)}`)
          .then((r) => r.json())
          .then((d) => setVehicleHistory(d.history || []))
          .catch(() => {});
      } else {
        setNoVehicleFound(true);
        setDbFields(new Set());
        setVehicleHistory([]);
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
      {/* Vehicle Inspection History */}
          {vehicleHistory.length > 0 && (
            <div className="card mb-4">
              <h2 className="section-title">📜 Past Inspections ({vehicleHistory.length})</h2>
              <div className="space-y-2">
                {vehicleHistory.map((h) => (
                  <div key={h.inspection_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-xs font-semibold text-gray-700">{h.test_date || '—'}</div>
                      <div className="text-xs text-gray-400">{h.inspector_username}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.inspection_result && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          h.inspection_result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>{h.inspection_result}</span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        h.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        h.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                        h.status === 'Pending'  ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{h.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Details */}
          <div className="card mb-4">
            <h2 className="section-title">🚗 Vehicle Details</h2>
            <Field
              label="Engine Number"
              value={form.engine_number}
              onChange={(v) => set("engine_number", v)}
              error={errors.engine_number}
              required
              locked={isLocked('engine_number')}
            />
            <Field
              label="Chassis Number"
              value={form.chassis_number}
              onChange={(v) => set("chassis_number", v)}
              error={errors.chassis_number}
              required
              locked={isLocked('chassis_number')}
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
              {isLocked('registration_date') ? (
                <LockedDisplay value={form.registration_date} />
              ) : (
                <DateInput
                  value={form.registration_date}
                  onChange={(e) => set("registration_date", e.target.value)}
                  className="form-input"
                />
              )}
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
              locked={isLocked('owner_name')}
            />
            <div className="mb-4">
              <label className="form-label">
                Owner Phone <span className="text-red-500">*</span>
              </label>
              {isLocked('owner_phone') ? (
                <LockedDisplay value={form.owner_phone} />
              ) : (
                <input
                  type="tel"
                  value={form.owner_phone}
                  onChange={(e) => set("owner_phone", e.target.value)}
                  className="form-input"
                  maxLength={10}
                />
              )}
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
              {isLocked('mandal_name') ? (
                <LockedDisplay value={form.mandal_name} />
              ) : (
                <>
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
                </>
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
              {isLocked('vehicle_lane') ? (
                <LockedDisplay value={form.vehicle_lane} />
              ) : (
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
              )}
              {errors.vehicle_lane && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.vehicle_lane}
                </p>
              )}
            </div>
            {isLocked('lane_type') ? (
              <div className="mb-4">
                <label className="form-label">Vehicle Lane Type <span className="text-red-500">*</span></label>
                <LockedDisplay value={form.lane_type} />
              </div>
            ) : (
              <>
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
              </>
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

function LockedDisplay({ value }) {
  return (
    <div className="form-input bg-gray-50 text-gray-700 flex items-center gap-2 cursor-not-allowed select-none">
      <span className="text-gray-400 text-xs">🔒</span>
      <span>{value || '—'}</span>
    </div>
  );
}

function Field({ label, value, onChange, error, required, type = "text", placeholder = "", locked = false }) {
  return (
    <div className="mb-4">
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {locked ? (
        <LockedDisplay value={value} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="form-input"
          placeholder={placeholder}
        />
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
