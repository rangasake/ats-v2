import { useState } from 'react';
import { VEHICLE_LANES, LANE_TYPES } from '../../lib/constants';
import SearchableDropdown from '../ui/SearchableDropdown';

export default function Step2DocumentChecklist({ data, onSave, loading, username, onExistingDraft }) {
  const [vehicleNumber, setVehicleNumber] = useState(data?.vehicle_number || '');
  const [searchDone, setSearchDone] = useState(!!data?.vehicle_number);
  const [searching, setSearching] = useState(false);
  const [noVehicleFound, setNoVehicleFound] = useState(false);
  const [loadedInspectionId, setLoadedInspectionId] = useState(null);

  const [vehicleLane, setVehicleLane] = useState(data?.vehicle_lane || '');
  const [laneType, setLaneType] = useState(data?.lane_type || '');
  const [laneErrors, setLaneErrors] = useState({});
  const [errors, setErrors] = useState({});

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

    onSave({
      ...(loadedInspectionId ? { loaded_inspection_id: loadedInspectionId } : {}),
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      vehicle_lane: vehicleLane,
      lane_type: laneType,
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
            onChange={(e) => { setVehicleNumber(e.target.value.toUpperCase()); setNoVehicleFound(false); setErrors({}); }}
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
