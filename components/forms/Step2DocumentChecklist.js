import { useState, useEffect } from 'react';
import { VEHICLE_LANES, LANE_TYPES } from '../../lib/constants';
import SearchableDropdown from '../ui/SearchableDropdown';

export default function Step2DocumentChecklist({ data, onSave, loading, username, onExistingDraft }) {
  const [vehicleNumber, setVehicleNumber] = useState(data?.vehicle_number || '');
  const [searchDone, setSearchDone] = useState(!!data?.vehicle_number);
  const [searching, setSearching] = useState(false);
  const [noVehicleFound, setNoVehicleFound] = useState(false);
  const [loadedInspectionId, setLoadedInspectionId] = useState(null);
  const [allowStatus, setAllowStatus] = useState(null); // 'allowed' | 'not-allowed' | null

  const [vehicleLane, setVehicleLane] = useState(data?.vehicle_lane || '');
  const [laneType, setLaneType] = useState(data?.lane_type || '');
  const [laneErrors, setLaneErrors] = useState({});
  const [errors, setErrors] = useState({});

  const [allowVehicles, setAllowVehicles] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Check allow list status when resuming (vehicle number prefilled)
  useEffect(() => {
    if (data?.vehicle_number) checkAllowList(data.vehicle_number);
  }, []);

  // Load vehicle numbers from the allow list for the search dropdown
  useEffect(() => {
    fetch('/api/allowlist/list')
      .then((r) => r.json())
      .then((d) => setAllowVehicles(d.allowlist || []))
      .catch(() => {});
  }, []);

  const filteredAllowVehicles = allowVehicles.filter(
    (v) => !vehicleNumber || String(v.v_num || '').includes(vehicleNumber.toUpperCase())
  );

  async function checkAllowList(vn) {
    try {
      const res = await fetch(`/api/allowlist/check?vehicle_number=${encodeURIComponent(vn)}`);
      const json = await res.json();
      setAllowStatus(json.allowed ? 'allowed' : 'not-allowed');
    } catch (e) {
      setAllowStatus(null);
    }
  }

  async function searchVehicle(vnOverride) {
    const vn = (vnOverride || vehicleNumber).trim().toUpperCase();
    if (!vn) return;
    setSearching(true);
    setDropdownOpen(false);
    try {
      const res = await fetch(`/api/vehicle/search?vehicle_number=${encodeURIComponent(vn)}`);
      const json = await res.json();
      setAllowStatus(null);
      await checkAllowList(vn);
      if (json.found) {
        setVehicleLane(json.vehicle.vehicle_lane || '');
        setLaneType(json.vehicle.lane_type || '');
        setNoVehicleFound(false);
        setSearchDone(true);
        await checkExistingDraft(vn);
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

  // If this vehicle already has a draft inspection, surface it: prefill the
  // form when it belongs to the current inspector, or ask the parent to show
  // the takeover popup otherwise.
  async function checkExistingDraft(vn) {
    try {
      const draftRes = await fetch(`/api/inspection/check-draft?vehicle_number=${encodeURIComponent(vn)}`);
      const draftData = await draftRes.json();
      if (!draftData.draft) return;

      const draft = draftData.draft;
      if (draft.inspector_username !== username) {
        if (onExistingDraft) onExistingDraft(draft);
        return;
      }

      const iRes = await fetch(`/api/inspection/get?id=${draft.inspection_id}`);
      const iData = await iRes.json();
      const insp = iData.inspection;
      if (!insp) return;

      setLoadedInspectionId(insp.inspection_id);
      if (insp.vehicle_lane) setVehicleLane(insp.vehicle_lane);
      if (insp.lane_type) setLaneType(insp.lane_type);
    } catch (e) {
      console.error(e);
    }
  }

  function handleSave() {
    const errs = {};
    const laneErrs = {};
    if (!vehicleNumber.trim()) errs._vehicle = 'Vehicle number is required';
    if (!vehicleLane) laneErrs.vehicle_lane = 'Required';
    if (!laneType) laneErrs.lane_type = 'Required';

    if (Object.keys(laneErrs).length > 0) {
      setLaneErrors(laneErrs);
    }
    if (Object.keys(errs).length > 0 || Object.keys(laneErrs).length > 0) {
      setErrors(errs);
      return;
    }

    const booking = allowVehicles.find(
      (v) => String(v.v_num || '').trim().toUpperCase() === vehicleNumber.trim().toUpperCase()
    );

    onSave({
      ...(loadedInspectionId ? { loaded_inspection_id: loadedInspectionId } : {}),
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      vehicle_lane: vehicleLane,
      lane_type: laneType,
      ...(booking && booking.b_num ? { b_num: booking.b_num } : {}),
      ...(booking && booking.b_nam ? { b_nam: booking.b_nam } : {}),
    });
  }

  return (
    <div>
      {/* Vehicle Search */}
      <div className="card mb-4">
        <h2 className="section-title">🔍 Vehicle Search</h2>
        {/* {noVehicleFound && (
          <p className="text-red-500 text-xs my-2">
            Vehicle not found in prev. Lane details can still be selected below.
          </p>
        )} */}
          {errors._vehicle && <p className="text-red-500 text-xs mt-1">{errors._vehicle}</p>}
        {/* {allowStatus && (
          <p className={`text-xs mb-1 font-semibold ${allowStatus === 'allowed' ? 'text-green-600' : 'text-red-500'}`}>
            {allowStatus === 'allowed' ? 'Vehicle is in the  list' : 'Vehicle is NOT in the list'}
          </p>
        )} */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter Vehicle Number (e.g. AP02AB1234)"
              value={vehicleNumber}
              onChange={(e) => { setVehicleNumber(e.target.value.toUpperCase()); setNoVehicleFound(false); setErrors({}); setAllowStatus(null); setDropdownOpen(true); }}
              onKeyDown={(e) => e.key === 'Enter' && searchVehicle()}
              onFocus={() => setDropdownOpen(true)}
              onMouseEnter={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              className="form-input uppercase"
              style={{ border: allowStatus === 'allowed' ? '2px solid #22c55e' : allowStatus === 'not-allowed' ? '2px solid #ef4444' : undefined }}
              disabled={searchDone}
            />
            {dropdownOpen && !searchDone && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {filteredAllowVehicles.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">No vehicles found on allow list</div>
                ) : (
                  filteredAllowVehicles.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => {
                        setVehicleNumber(String(v.v_num || '').toUpperCase());
                        setDropdownOpen(false);
                        searchVehicle(String(v.v_num || '').toUpperCase());
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center justify-between gap-2"
                    >
                      <span className="font-mono font-semibold text-gray-800 text-sm">{v.v_num}</span>
                      <span className="text-xs text-gray-400 truncate">{v.b_nam || ''}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {!searchDone ? (
            <button
              type="button"
              onClick={() => searchVehicle()}
              disabled={searching || !vehicleNumber}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm whitespace-nowrap disabled:opacity-50 active:scale-95"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setSearchDone(false); setVehicleNumber(''); setNoVehicleFound(false); setVehicleLane(''); setLaneType(''); setAllowStatus(null); setDropdownOpen(false); }}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm whitespace-nowrap active:scale-95"
            >
              Clear
            </button>
          )}
        </div>
      
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
