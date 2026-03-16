import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppLayout from '../../components/layout/AppLayout';
import StepIndicator from '../../components/ui/StepIndicator';
import Step1CommonData from '../../components/forms/Step1CommonData';
import Step2DocumentChecklist from '../../components/forms/Step2DocumentChecklist';
import Step3VisualChecklist from '../../components/forms/Step3VisualChecklist';
import Step4StaffFeedback from '../../components/forms/Step4StaffFeedback';
import { withAuth } from '../../lib/useAuth';
import { ROLES } from '../../lib/constants';

const STEPS = ['Common Data', 'Documents', 'Visual Test', 'Staff & Feedback'];

function NewInspection() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inspectionId, setInspectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data per step
  const [vehicleData, setVehicleData] = useState({});
  const [docData, setDocData] = useState({});
  const [visualData, setVisualData] = useState({});
  const [laneConfig, setLaneConfig] = useState({ doc_hidden: [], visual_hidden: [] });

  // ── Step 1: Save vehicle + start inspection ──────────────────────────────
  async function handleStep1(formData) {
    setLoading(true);
    setError('');
    try {
      // Save vehicle to DB
      const vRes = await fetch('/api/vehicle/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!vRes.ok) throw new Error('Failed to save vehicle');

      // Fetch lane config for this lane type
      const cfgRes = await fetch('/api/admin/lane-config');
      const cfgData = await cfgRes.json();
      const cfg = (cfgData.configs || []).find((c) => c.lane_type === formData.lane_type);
      const docHidden = cfg ? tryParse(cfg.doc_hidden_items, []) : [];
      const visualHidden = cfg ? tryParse(cfg.visual_hidden_items, []) : [];
      setLaneConfig({ doc_hidden: docHidden, visual_hidden: visualHidden });

      // Create inspection record (step 1)
      const iRes = await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, vehicle_number: formData.vehicle_number }),
      });
      const iData = await iRes.json();
      if (!iData.inspection_id) throw new Error('Failed to create inspection');

      setInspectionId(iData.inspection_id);
      setVehicleData(formData);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Save doc checklist ───────────────────────────────────────────
  async function handleStep2(formData) {
    setLoading(true);
    setError('');
    try {
      await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_id: inspectionId, step: 2, ...formData }),
      });
      setDocData(formData);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Save visual checklist ────────────────────────────────────────
  async function handleStep3(formData) {
    setLoading(true);
    setError('');
    try {
      await fetch('/api/inspection/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: inspectionId,
          step: 3,
          visual_data: JSON.stringify(formData),
        }),
      });
      setVisualData(formData);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 4: Submit ───────────────────────────────────────────────────────
  async function handleSubmit(formData) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inspection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_id: inspectionId, ...formData }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      router.push(`/inspection/${inspectionId}?submitted=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>New Inspection - AFTS</title></Head>
      <AppLayout title="New Inspection">
        <StepIndicator currentStep={step} steps={STEPS} />

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
