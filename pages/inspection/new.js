import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppLayout from '../../components/layout/AppLayout';
import StepIndicator from '../../components/ui/StepIndicator';
import Step1CommonData from '../../components/forms/Step1CommonData';
import Step2DocumentChecklist from '../../components/forms/Step2DocumentChecklist';
import Step3VisualChecklist from '../../components/forms/Step3VisualChecklist';
import Step4StaffFeedback from '../../components/forms/Step4StaffFeedback';
import { withAuth } from '../../lib/useAuth';
import { useAuth } from '../../lib/useAuth';
import { ROLES } from '../../lib/constants';

const STEPS = ['Common Data', 'Documents', 'Visual Test', 'Staff & Feedback'];

function cleanVehicleData(data) {
  const { created_at, updated_at, status, ...vehicleData } = data;
  return vehicleData;
}

function NewInspection() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inspectionId, setInspectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflictDraft, setConflictDraft] = useState(null); // { inspection_id, inspector_username, step, updated_at }
  const [takingOver, setTakingOver] = useState(false);
  const { user } = useAuth();

  const [vehicleData, setVehicleData] = useState({});
  const [docData, setDocData] = useState({});
  const [visualData, setVisualData] = useState({});
  const [laneConfig, setLaneConfig] = useState({ doc_hidden: [], visual_hidden: [] });
  const [rejectionInfo, setRejectionInfo] = useState(null); // { fail_reason, supervisor_remarks }

  // ── Resume draft when ?resume=ID present ──────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    const resumeId = router.query.resume;
    if (resumeId) loadDraft(resumeId);
  }, [router.isReady, router.query.resume]);

  async function loadDraft(id) {
    setResumeLoading(true);
    setError('');
    try {
      // 1. Fetch inspection record
      const iRes  = await fetch(`/api/inspection/get?id=${id}`);
      const iData = await iRes.json();
      if (!iData.inspection) throw new Error('Draft inspection not found');
      const insp = iData.inspection;
      setInspectionId(insp.inspection_id);

      // 2. Fetch vehicle data
      const vRes  = await fetch(`/api/vehicle/search?vehicle_number=${insp.vehicle_number}`);
      const vData = await vRes.json();
      if (!vData.found) throw new Error('Vehicle not found for this draft');
      const vehicle = vData.vehicle;
      setVehicleData({ ...vehicle, status: insp.status });

      // 3. Lane config
      const cfgRes  = await fetch('/api/admin/lane-config');
      const cfgData = await cfgRes.json();
      const cfg     = (cfgData.configs || []).find((c) => c.lane_type === vehicle.lane_type);
      setLaneConfig({
        doc_hidden:    cfg ? tryParse(cfg.doc_hidden_items, [])    : [],
        visual_hidden: cfg ? tryParse(cfg.visual_hidden_items, []) : [],
      });

      // 4. Restore step-2 doc fields
      setDocData({
        test_date:         insp.test_date         || '',
        test_type:         insp.test_type         || '',
        afms_free_receipt: insp.afms_free_receipt || '',
        rc:                insp.rc                || '',
        last_rc:           insp.last_rc           || '',
        last_rc_expiry:    insp.last_rc_expiry    || '',
        puc:               insp.puc               || '',
        puc_expiry:        insp.puc_expiry        || '',
        insurance:         insp.insurance         || '',
        insurance_expiry:  insp.insurance_expiry  || '',
        insurance_company: insp.insurance_company || '',
        speed_governor:    insp.speed_governor    || '',
        vlt_device:        insp.vlt_device        || '',
      });

      // 5. Restore step-3 visual data and already-uploaded image metadata
      const restoredVisualData = insp.visual_data ? tryParse(insp.visual_data, {}) : {};
      if (insp.image_urls_json) {
        restoredVisualData.uploaded_images = insp.image_urls_json;
      }
      if (insp.lat_long) {
        restoredVisualData.lat_long = insp.lat_long;
      }
      setVisualData(restoredVisualData);

      // 6. Rejected → always go to Step 1 so inspector reviews everything from scratch
      //    Draft → jump to next incomplete step
      if (insp.status === 'Rejected') {
        setStep(1);
        if (insp.fail_reason || insp.supervisor_remarks) {
          setRejectionInfo({
            fail_reason:        insp.fail_reason        || '',
            supervisor_remarks: insp.supervisor_remarks || '',
          });
        }
      } else {
        const savedStep = parseInt(insp.step || '1', 10);
        setStep(Math.min(savedStep + 1, 4));
      }

    } catch (e) {
      setError(`Could not load draft: ${e.message}`);
    } finally {
      setResumeLoading(false);
    }
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────
  async function handleStep1(formData) {
    setLoading(true);
    setError('');
    try {
      const vehiclePayload = cleanVehicleData(formData);
      const vRes = await fetch('/api/vehicle/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehiclePayload),
      });
      if (!vRes.ok) throw new Error('Failed to save vehicle');

      const cfgRes  = await fetch('/api/admin/lane-config');
      const cfgData = await cfgRes.json();
      const cfg     = (cfgData.configs || []).find((c) => c.lane_type === vehiclePayload.lane_type);
      setLaneConfig({
        doc_hidden:    cfg ? tryParse(cfg.doc_hidden_items, [])    : [],
        visual_hidden: cfg ? tryParse(cfg.visual_hidden_items, []) : [],
      });

      // ── Check if another draft exists for this vehicle ────────────────────
      const draftRes  = await fetch(`/api/inspection/check-draft?vehicle_number=${encodeURIComponent(vehiclePayload.vehicle_number)}`);
      const draftData = await draftRes.json();

      if (draftData.draft) {
        const draft = draftData.draft;
        if (draft.inspector_username === user?.username) {
          // Same user — just resume their own draft
          router.push(`/inspection/new?resume=${draft.inspection_id}`);
          return;
        } else {
          // Different user — show conflict popup, hold vehicle data for later
          setVehicleData(vehiclePayload);
          setLaneConfig({
            doc_hidden:    cfg ? tryParse(cfg.doc_hidden_items, [])    : [],
            visual_hidden: cfg ? tryParse(cfg.visual_hidden_items, []) : [],
          });
          setConflictDraft(draft);
          setLoading(false);
          return;
        }
      }

      const iRes  = await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, vehicle_number: vehiclePayload.vehicle_number }),
      });
      const iData = await iRes.json();
      if (!iData.inspection_id) throw new Error('Failed to create inspection');

      setInspectionId(iData.inspection_id);
      setVehicleData(vehiclePayload);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  async function handleStep2(formData) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_id: inspectionId, step: 2, ...formData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save documents');
      }
      setDocData(formData);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────
  async function handleStep3(formData) {
    setLoading(true);
    setError('');
    try {
      // Separate image URLs from visual checklist data
      const { uploaded_images, lat_long, ...visualChecklist } = formData;

      // uploaded_images = JSON string of [{ directUrl, viewUrl, label, ... }]
      // Extract just the direct URLs as a clean comma-separated string for easy reading in Sheets
      let imageUrlsFlat = '';
      let imageUrlsJson = uploaded_images || '';
      if (uploaded_images) {
        try {
          const parsed = JSON.parse(uploaded_images);
          imageUrlsFlat = parsed.map((img) => img.directUrl).filter(Boolean).join(', ');
        } catch {}
      }

      const saveRes = await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id:  inspectionId,
          step:           3,
          visual_data:    JSON.stringify(visualChecklist), // checklist only
          image_urls:     imageUrlsFlat,                  // comma-separated URLs — easy to read in Sheets
          image_urls_json: imageUrlsJson,                 // full JSON with labels, dimensions etc.
          lat_long:        lat_long || '',
        }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json().catch(() => ({}));
        throw new Error(saveData.error || 'Failed to save visual data');
      }
      setVisualData(formData);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Maps a server-reported missing field label to the step it belongs to
  function fieldLabelToStep(label) {
    const step2 = ['Test Date', 'Test Type'];
    const step3 = ['Vehicle Location'];
    if (step2.some((f) => label.includes(f))) return 2;
    if (step3.some((f) => label.includes(f))) return 3;
    return 4; // lane_inspector / lane_incharge default to step 4
  }

  // ── Step 4 ────────────────────────────────────────────────────────────────
  async function handleSubmit(formData) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inspection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_id: inspectionId, ...formData }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Failed to submit';
        // If error mentions missing fields, extract them and navigate to the earliest step
        const missingMatch = msg.match(/Missing required fields?:\s*(.+)/i);
        if (missingMatch) {
          const fields = missingMatch[1].split(',').map((s) => s.trim());
          const earliestStep = fields.reduce((min, f) => Math.min(min, fieldLabelToStep(f)), 4);
          setError(`Step ${earliestStep} incomplete — ${fields.join(', ')} required`);
          setStep(earliestStep);
        } else {
          setError(msg);
        }
        return;
      }
      router.push(`/inspection/${inspectionId}?submitted=1`);
    } catch (e) {
      setError(e.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state while restoring draft ───────────────────────────────────
  if (resumeLoading) {
    return (
      <AppLayout title="Resuming Draft...">
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-gray-700">Loading draft inspection...</p>
          <p className="text-xs text-gray-400 mt-1">Restoring your saved progress</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <Head><title>{router.query.resume ? 'Resume Inspection' : 'New Inspection'} - AFTS</title></Head>
      <AppLayout title={router.query.resume ? `Resume: ${router.query.resume}` : 'New Inspection'}>

        {/* ── Draft conflict popup ─────────────────────────────────────────── */}
        {conflictDraft && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="text-3xl text-center mb-3">⚠️</div>
              <h2 className="text-lg font-extrabold text-gray-800 text-center mb-2">Draft Already Exists</h2>
              <p className="text-sm text-gray-600 text-center mb-1 whitespace-nowrap">
                This vehicle inspection was started by
              </p>
              <p className="text-base font-extrabold text-blue-700 text-center mb-1 whitespace-nowrap">
                {conflictDraft.inspector_username}
              </p>
              <p className="text-xs text-gray-400 text-center mb-4 whitespace-nowrap">
                Step {conflictDraft.step} of 4 · Last saved {conflictDraft.updated_at ? new Date(conflictDraft.updated_at).toLocaleString() : '—'}
              </p>
              <p className="text-sm text-gray-600 text-center mb-5 whitespace-nowrap">
                Do you still want to continue?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  disabled={takingOver}
                  onClick={async () => {
                    setTakingOver(true);
                    try {
                      const res  = await fetch('/api/inspection/takeover', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ inspection_id: conflictDraft.inspection_id }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Takeover failed');
                      setConflictDraft(null);
                      router.push(`/inspection/new?resume=${conflictDraft.inspection_id}`);
                    } catch (e) {
                      setError(e.message);
                      setConflictDraft(null);
                    } finally {
                      setTakingOver(false);
                    }
                  }}
                  className="btn-primary"
                >
                  {takingOver ? 'Please wait...' : '✅ Yes, Continue from where they left off'}
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-secondary"
                >
                  ← No, Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resume / resubmit banner */}
        {router.query.resume && !resumeLoading && (
          <div className={`rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm
            ${vehicleData.status === 'Rejected'
              ? 'bg-orange-50 border border-orange-300 text-orange-800'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
            <span>{vehicleData.status === 'Rejected' ? '⚠️' : '✏️'}</span>
            <span>
              {vehicleData.status === 'Rejected'
                ? <>Editing <strong>rejected</strong> inspection <strong>{router.query.resume}</strong> — fix and resubmit</>
                : <>Resuming draft <strong>{router.query.resume}</strong> — continue from where you left off</>
              }
            </span>
          </div>
        )}

        <StepIndicator currentStep={step} steps={STEPS} />

        {/* Rejection reason — shown on every step when re-editing a failed inspection */}
        {rejectionInfo && (
          <div className="bg-red-50 border border-red-300 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">❌</span>
              <span className="font-bold text-red-800 text-sm">Rejection Reason</span>
            </div>
            {rejectionInfo.fail_reason && (
              <p className="text-sm text-red-700 bg-red-100 rounded-xl px-3 py-2 mb-2 font-medium">
                {rejectionInfo.fail_reason}
              </p>
            )}
            {rejectionInfo.supervisor_remarks && (
              <p className="text-xs text-red-600">
                <span className="font-semibold">Supervisor note:</span> {rejectionInfo.supervisor_remarks}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠️ {error}
          </div>
        )}

        {step === 1 && (
          <Step1CommonData data={vehicleData} onSave={handleStep1} loading={loading} />
        )}
        {step === 2 && (
          <Step2DocumentChecklist
            data={docData}
            laneType={vehicleData.lane_type}
            vehicleNumber={vehicleData.vehicle_number}
            vehicleLane={vehicleData.vehicle_lane}
            registrationDate={vehicleData.registration_date}
            hiddenItems={laneConfig.doc_hidden}
            onSave={handleStep2}
            onBack={() => setStep(1)}
            loading={loading}
          />
        )}
        {step === 3 && (
          <Step3VisualChecklist
            data={visualData}
            laneType={vehicleData.lane_type}
            hiddenItems={laneConfig.visual_hidden}
            inspectionId={inspectionId}
            vehicleNumber={vehicleData.vehicle_number}
            vehicleLane={vehicleData.vehicle_lane}
            onSave={handleStep3}
            onBack={() => setStep(2)}
            loading={loading}
          />
        )}
        {step === 4 && (
          <Step4StaffFeedback
            data={{}}
            onSubmit={handleSubmit}
            onBack={() => setStep(3)}
            loading={loading}
          />
        )}
      </AppLayout>
    </>
  );
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default withAuth(NewInspection, [ROLES.INSPECTOR, ROLES.ADMIN]);
