import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/layout/AppLayout';
import StatusBadge from '../../../components/ui/StatusBadge';
import SearchableDropdown from '../../../components/ui/SearchableDropdown';
import DateInput from '../../../components/ui/DateInput';
import { withAuth } from '../../../lib/useAuth';
import { ROLES, VISUAL_CHECKLIST_ITEMS, INSPECTION_STATUS, VEHICLE_LANES, LANE_TYPES } from '../../../lib/constants';

function safeParseJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
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

function SupervisorReview() {
  const router = useRouter();
  const { id } = router.query;
  const [inspection, setInspection] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agentPhone, setAgentPhone] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentLookingUp, setAgentLookingUp] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [savingAgent, setSavingAgent] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [inspectionResult, setInspectionResult] = useState('');
  const [failReason, setFailReason] = useState('');
  const [error, setError] = useState('');

  const [mandals, setMandals] = useState({ mandals: [], mandalRtoMap: {} });
  const [otherMandal, setOtherMandal] = useState('');
  const [vehicleErrors, setVehicleErrors] = useState({});
  const [ownerErrors, setOwnerErrors] = useState({});

  const [vehicleForm, setVehicleForm] = useState({
    engine_number: '',
    chassis_number: '',
    meter_reading: '',
    registration_date: '',
  });
  const [ownerForm, setOwnerForm] = useState({
    owner_name: '',
    owner_phone: '',
    mandal_name: '',
    rto_office: '',
    vehicle_lane: '',
    lane_type: '',
  });

  useEffect(() => {
    if (id) fetchData();
    fetch('/api/config/mandals')
      .then((r) => r.json())
      .then((d) => setMandals(d || {}))
      .catch(() => {});
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const iRes = await fetch(`/api/inspection/get?id=${id}`);
      const iData = await iRes.json();
      if (iData.inspection) {
        setInspection(iData.inspection);
        const vRes = await fetch(`/api/vehicle/search?vehicle_number=${iData.inspection.vehicle_number}`);
        const vData = await vRes.json();
        if (vData.found) {
          setVehicle(vData.vehicle);
          setVehicleForm({
            engine_number:     vData.vehicle.engine_number     || '',
            chassis_number:    vData.vehicle.chassis_number    || '',
            meter_reading:     vData.vehicle.meter_reading     || '',
            registration_date: normalizeDateForInput(vData.vehicle.registration_date),
          });
          setOwnerForm({
            owner_name:    vData.vehicle.owner_name    || '',
            owner_phone:   vData.vehicle.owner_phone   || '',
            mandal_name:   vData.vehicle.mandal_name   || '',
            rto_office:    vData.vehicle.rto_office    || '',
            vehicle_lane:  vData.vehicle.vehicle_lane  || inspection?.vehicle_lane  || '',
            lane_type:     vData.vehicle.lane_type     || inspection?.lane_type     || '',
          });
          if (vData.vehicle.mandal_name && !mandals.mandals.includes(vData.vehicle.mandal_name)) {
            setOtherMandal(vData.vehicle.mandal_name);
          }
        } else {
          setOwnerForm((prev) => ({
            ...prev,
            vehicle_lane: inspection?.vehicle_lane || '',
            lane_type:    inspection?.lane_type    || '',
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function lookupAgent() {
    if (!agentPhone || agentPhone.length < 10) return;
    setAgentLookingUp(true);
    setNewAgentName('');
    try {
      const res = await fetch(`/api/supervisor/agent-lookup?phone=${agentPhone}`);
      const data = await res.json();
      if (data.found) setAgentName(data.agent.name || '');
      else setAgentName('');
    } catch (e) {}
    finally { setAgentLookingUp(false); }
  }

  async function saveNewAgent() {
    if (!newAgentName.trim()) return;
    setSavingAgent(true);
    try {
      const res = await fetch('/api/supervisor/agent-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: agentPhone, name: newAgentName.trim() }),
      });
      if (res.ok) {
        setAgentName(newAgentName.trim());
        setNewAgentName('');
      }
    } catch (e) {}
    finally { setSavingAgent(false); }
  }

  async function saveVehicleData() {
    if (!inspection) return;
    const mandalName = ownerForm.mandal_name === 'OTHER' || (ownerForm.mandal_name && !mandals.mandals.includes(ownerForm.mandal_name))
      ? otherMandal.trim()
      : ownerForm.mandal_name;
    const rtoOffice = mandalName === otherMandal.trim() ? otherMandal.trim() : (mandals.mandalRtoMap[ownerForm.mandal_name] || ownerForm.rto_office);

    const payload = {
      vehicle_number:    inspection.vehicle_number,
      engine_number:     vehicleForm.engine_number,
      chassis_number:    vehicleForm.chassis_number,
      meter_reading:     vehicleForm.meter_reading,
      registration_date: vehicleForm.registration_date,
      owner_name:        ownerForm.owner_name,
      owner_phone:       ownerForm.owner_phone,
      mandal_name:       mandalName,
      rto_office:        rtoOffice,
      vehicle_lane:      ownerForm.vehicle_lane,
      lane_type:         ownerForm.lane_type,
    };

    try {
      await fetch('/api/vehicle/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to save vehicle data:', e);
    }
  }

  function validateForms() {
    const vErr = {};
    const oErr = {};

    if (!vehicleForm.engine_number.trim()) vErr.engine_number = 'Required';
    if (!vehicleForm.chassis_number.trim()) vErr.chassis_number = 'Required';
    if (!vehicleForm.meter_reading.trim()) vErr.meter_reading = 'Required';
    if (!vehicleForm.registration_date) vErr.registration_date = 'Required';

    if (!ownerForm.owner_name.trim()) oErr.owner_name = 'Required';
    if (!ownerForm.owner_phone.trim() || ownerForm.owner_phone.length < 10) oErr.owner_phone = 'Valid 10-digit phone required';
    if (!ownerForm.mandal_name) oErr.mandal_name = 'Required';
    if (ownerForm.mandal_name === 'OTHER' && !otherMandal.trim()) oErr.mandal_name = 'Please enter mandal name';
    if (!ownerForm.vehicle_lane) oErr.vehicle_lane = 'Required';
    if (!ownerForm.lane_type) oErr.lane_type = 'Required';

    setVehicleErrors(vErr);
    setOwnerErrors(oErr);
    return Object.keys(vErr).length === 0 && Object.keys(oErr).length === 0;
  }

  async function handleAction(action) {
    setSubmitting(true);
    setError('');

    if (!validateForms()) {
      setError('Please fill all required fields in Vehicle Details and Owner Details.');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!agentPhone.trim() || agentPhone.length < 10) {
      setError('Booking Phone Number is required.');
      setSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    if (!inspectionResult) {
      setError('Please select Inspection Result (Pass or Fail) before proceeding.');
      setSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    if (inspectionResult === 'Fail' && !failReason.trim()) {
      setError('Please enter a Fail Reason before rejecting.');
      setSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    await saveVehicleData();

    try {
      const res = await fetch('/api/supervisor/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id:      id,
          action,
          agent_phone:        agentPhone,
          agent_name:         agentName,
          booking_id:         bookingId.trim().toUpperCase(),
          supervisor_remarks: remarks,
          inspection_result:  inspectionResult,
          fail_reason:        inspectionResult === 'Fail' ? failReason.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push(`/inspection/${id}?reviewed=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateVehicle(field, value) {
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  }

  function setOwner(field, value) {
    setOwnerForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'mandal_name') {
        next.rto_office = mandals?.mandalRtoMap[value] || '';
      }
      return next;
    });
  }

  const visualData = inspection ? safeParseJSON(inspection.visual_data, {}) : {};

  if (loading) return <AppLayout title="Review"><div className="text-center py-16 text-gray-400">Loading...</div></AppLayout>;
  if (!inspection) return <AppLayout title="Not Found"><div className="text-center py-16 text-gray-400">Not found</div></AppLayout>;

  return (
    <>
      <Head><title>Review {id} - AFTS</title></Head>
      <AppLayout title="Review Inspection">
        {/* Header */}
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-extrabold text-gray-800">{inspection.vehicle_number}</div>
              <div className="text-xs text-gray-500 mt-0.5">ID: {inspection.inspection_id}</div>
            </div>
            <StatusBadge status={inspection.status} />
          </div>
          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
            {inspection.lane_type && <span>🛣️ {inspection.lane_type}</span>}
            {inspection.test_date && <span>📅 {inspection.test_date}</span>}
            <span>By: {inspection.inspector_username}</span>
          </div>
        </div>

        {/* Vehicle Details - Editable */}
        <div className="card mb-4">
          <h2 className="section-title">🚗 Vehicle Details</h2>
          <div className="mb-4">
            <label className="form-label">Engine Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={vehicleForm.engine_number}
              onChange={(e) => { updateVehicle('engine_number', e.target.value); setVehicleErrors((p) => ({ ...p, engine_number: '' })); }}
              className={`form-input${vehicleErrors.engine_number ? ' border-red-400' : ''}`}
              placeholder="Enter engine number"
            />
            {vehicleErrors.engine_number && <p className="text-red-500 text-xs mt-1">{vehicleErrors.engine_number}</p>}
          </div>
          <div className="mb-4">
            <label className="form-label">Chassis Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={vehicleForm.chassis_number}
              onChange={(e) => { updateVehicle('chassis_number', e.target.value); setVehicleErrors((p) => ({ ...p, chassis_number: '' })); }}
              className={`form-input${vehicleErrors.chassis_number ? ' border-red-400' : ''}`}
              placeholder="Enter chassis number"
            />
            {vehicleErrors.chassis_number && <p className="text-red-500 text-xs mt-1">{vehicleErrors.chassis_number}</p>}
          </div>
          <div className="mb-4">
            <label className="form-label">Meter Reading <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={vehicleForm.meter_reading}
              onChange={(e) => { updateVehicle('meter_reading', e.target.value); setVehicleErrors((p) => ({ ...p, meter_reading: '' })); }}
              className={`form-input${vehicleErrors.meter_reading ? ' border-red-400' : ''}`}
              placeholder="Meter reading KM"
            />
            {vehicleErrors.meter_reading && <p className="text-red-500 text-xs mt-1">{vehicleErrors.meter_reading}</p>}
          </div>
          <div className="mb-0">
            <label className="form-label">Registration Date <span className="text-red-500">*</span></label>
            <DateInput
              value={vehicleForm.registration_date}
              onChange={(e) => { updateVehicle('registration_date', e.target.value); setVehicleErrors((p) => ({ ...p, registration_date: '' })); }}
              className={`form-input${vehicleErrors.registration_date ? ' border-red-400' : ''}`}
            />
            {vehicleErrors.registration_date && <p className="text-red-500 text-xs mt-1">{vehicleErrors.registration_date}</p>}
          </div>
        </div>

        {/* Owner Details - Editable */}
        <div className="card mb-4">
          <h2 className="section-title">👤 Owner Details</h2>
          <div className="mb-4">
            <label className="form-label">Owner Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={ownerForm.owner_name}
              onChange={(e) => { setOwner('owner_name', e.target.value); setOwnerErrors((p) => ({ ...p, owner_name: '' })); }}
              className={`form-input${ownerErrors.owner_name ? ' border-red-400' : ''}`}
              placeholder="Enter owner name"
            />
            {ownerErrors.owner_name && <p className="text-red-500 text-xs mt-1">{ownerErrors.owner_name}</p>}
          </div>
          <div className="mb-4">
            <label className="form-label">Owner Phone <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={ownerForm.owner_phone}
              onChange={(e) => { setOwner('owner_phone', e.target.value); setOwnerErrors((p) => ({ ...p, owner_phone: '' })); }}
              className={`form-input${ownerErrors.owner_phone ? ' border-red-400' : ''}`}
              maxLength={10}
              placeholder="10-digit phone"
            />
            {ownerErrors.owner_phone && <p className="text-red-500 text-xs mt-1">{ownerErrors.owner_phone}</p>}
          </div>
          <div className="mb-4">
            <label className="form-label">Mandal Name <span className="text-red-500">*</span></label>
            <select
              value={
                mandals.mandals.includes(ownerForm.mandal_name)
                  ? ownerForm.mandal_name
                  : ownerForm.mandal_name ? 'OTHER' : ''
              }
              onChange={(e) => {
                if (e.target.value === 'OTHER') {
                  setOwner('mandal_name', 'OTHER');
                } else {
                  setOtherMandal('');
                  setOwner('mandal_name', e.target.value);
                }
                setOwnerErrors((p) => ({ ...p, mandal_name: '' }));
              }}
              className={`form-input${ownerErrors.mandal_name ? ' border-red-400' : ''}`}
            >
              <option value="">Select Mandal</option>
              {mandals.mandals.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="OTHER">Other</option>
            </select>
            {(ownerForm.mandal_name === 'OTHER' || (ownerForm.mandal_name && !mandals.mandals.includes(ownerForm.mandal_name))) && (
              <div className="mt-2">
                <label className="form-label">Other Mandal / RTO Office Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter mandal name"
                  value={otherMandal}
                  onChange={(e) => { setOtherMandal(e.target.value); setOwnerErrors((p) => ({ ...p, mandal_name: '' })); }}
                  className={`form-input${ownerErrors.mandal_name ? ' border-red-400' : ''}`}
                />
              </div>
            )}
            {ownerErrors.mandal_name && <p className="text-red-500 text-xs mt-1">{ownerErrors.mandal_name}</p>}
          </div>
          {ownerForm.mandal_name !== 'OTHER' && (!ownerForm.mandal_name || mandals.mandals.includes(ownerForm.mandal_name)) && (
            <div className="mb-4">
              <label className="form-label">RTO Office</label>
              <input
                type="text"
                value={ownerForm.rto_office}
                readOnly
                className="form-input bg-gray-50 text-gray-500"
                placeholder="Auto-filled from Mandal"
              />
            </div>
          )}
          <div className="mb-4">
            <label className="form-label">Vehicle Lane <span className="text-red-500">*</span></label>
            <select
              value={ownerForm.vehicle_lane}
              onChange={(e) => { setOwner('vehicle_lane', e.target.value); setOwnerErrors((p) => ({ ...p, vehicle_lane: '' })); }}
              className={`form-input${ownerErrors.vehicle_lane ? ' border-red-400' : ''}`}
            >
              <option value="">Select Lane</option>
              {VEHICLE_LANES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {ownerErrors.vehicle_lane && <p className="text-red-500 text-xs mt-1">{ownerErrors.vehicle_lane}</p>}
          </div>
          <div className="mb-0">
            <SearchableDropdown
              label="Vehicle Lane Type"
              options={LANE_TYPES}
              value={ownerForm.lane_type}
              onChange={(v) => { setOwner('lane_type', v); setOwnerErrors((p) => ({ ...p, lane_type: '' })); }}
              placeholder="Select Lane Type"
              required
            />
            {ownerErrors.lane_type && <p className="text-red-500 text-xs mt-1">{ownerErrors.lane_type}</p>}
          </div>
        </div>

        {/* Documents */}
        <div className="card mb-4">
          <h2 className="section-title">📄 Documents</h2>
          <Row label="Test Type" value={inspection.test_type} />
          <Row label="AFMS Receipt" value={inspection.afms_free_receipt} />
          <Row label="RC" value={inspection.rc} />
          <Row label="PUC / Expiry" value={`${inspection.puc || '-'} / ${inspection.puc_expiry || '-'}`} />
          <Row label="Insurance / Expiry" value={`${inspection.insurance || '-'} / ${inspection.insurance_expiry || '-'}`} />
          <Row label="Insurance Co." value={inspection.insurance_company} />
        </div>

        {/* Visual */}
        {Object.keys(visualData).length > 0 && (
          <div className="card mb-4">
            <h2 className="section-title">🔍 Visual Test</h2>
            <Row label="Vehicle Location" value={inspection.lat_long} />
            {VISUAL_CHECKLIST_ITEMS.map((item) => {
              const val = visualData[item.id];
              if (!val) return null;
              return (
                <div key={item.id} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`font-semibold ${val === 'Yes' ? 'text-green-600' : 'text-red-500'}`}>{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Staff */}
        <div className="card mb-4">
          <h2 className="section-title">👨‍💼 Staff & Feedback</h2>
          <Row label="Inspector" value={inspection.lane_inspector} />
          <Row label="Incharge" value={inspection.lane_incharge} />
          <Row label="Remarks" value={inspection.remarks} />
          <Row label="Feedback" value={inspection.feedback} />
        </div>

        {/* Supervisor Input */}
        <div className="card mb-4">
          <h2 className="section-title">🔐 Supervisor Details</h2>

          <div className="mb-4">
            <label className="form-label">Booking Phone Number <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={agentPhone}
                onChange={(e) => { setAgentPhone(e.target.value); setAgentName(''); }}
                onBlur={lookupAgent}
                className="form-input"
                placeholder="Enter 10-digit phone"
                maxLength={10}
              />
              {agentLookingUp && <div className="py-3 px-3 text-gray-400 text-sm">...</div>}
            </div>
          </div>

          {agentPhone.length >= 10 && (
            <div className="mb-4">
              <label className="form-label">Booking Name</label>
              {agentLookingUp ? (
                <div className="form-input bg-gray-50 text-gray-400 text-sm">Looking up...</div>
              ) : agentName ? (
                <div className="form-input bg-green-50 text-green-800 font-semibold">{agentName}</div>
              ) : (
                <div>
                  <div className="form-input bg-red-50 text-red-500 text-sm mb-3">No booking name found for this number</div>
                  <p className="text-xs text-gray-400 mb-2">Want to save this number as a booking phone number?</p>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="Enter booking name"
                    className="form-input mb-2"
                  />
                  <button
                    type="button"
                    onClick={saveNewAgent}
                    disabled={savingAgent || !newAgentName.trim()}
                    className="btn-primary w-full text-sm"
                  >
                    {savingAgent ? 'Saving...' : 'Save booking name'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="form-label">
              Booking ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value.toUpperCase())}
              className="form-input font-mono tracking-widest"
              placeholder="e.g. BK2026001"
              maxLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">Enter the Booking ID manually (required to approve)</p>
          </div>

          <div className="mb-4">
            <label className="form-label">Supervisor Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="form-input"
              rows={2}
              placeholder="Optional remarks..."
            />
          </div>

          <div className="mb-4">
            <label className="form-label">
              Inspection Result <span className="text-red-500">*</span>
            </label>
            <select
              value={inspectionResult}
              onChange={(e) => { setInspectionResult(e.target.value); setFailReason(''); }}
              className="form-input"
            >
              <option value="">-- Select Result --</option>
              <option value="Pass">✅ Pass</option>
              <option value="Fail">❌ Fail</option>
            </select>
          </div>

          {inspectionResult === 'Fail' && (
            <div className="mb-4">
              <label className="form-label">
                Fail Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="form-input border-red-300 focus:ring-red-400"
                rows={3}
                placeholder="Describe the reason for failure..."
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleAction('approve')}
            disabled={submitting}
            className="btn-success"
          >
            {submitting ? 'Processing...' : '✅ Approve Inspection'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={submitting}
            className="w-full py-3 rounded-xl border-2 border-red-400 text-red-600 font-semibold text-base active:scale-95 transition-all disabled:opacity-50"
          >
            ❌ Reject / Fail Inspection
          </button>
          <button
            onClick={() => router.push('/supervisor')}
            className="btn-secondary"
          >
            ← Back to Queue
          </button>
        </div>
      </AppLayout>
    </>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

export default withAuth(SupervisorReview, [ROLES.SUPERVISOR, ROLES.ADMIN]);
