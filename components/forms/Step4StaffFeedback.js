import { useState, useEffect } from 'react';
import { DISCLAIMER_POINTS } from '../../lib/constants';

export default function Step4StaffFeedback({ data, onSubmit, onBack, loading }) {
  const [form, setForm] = useState({
    lane_inspector: '',
    lane_incharge: '',
    remarks: '',
    feedback: '',
    ...data,
  });
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetch('/api/staff/list')
      .then((r) => r.json())
      .then((d) => setStaff(d.staff || []))
      .catch(() => {});
  }, []);

  const inspectors = staff.filter((s) => s.role === 'Inspector' || !s.role);
  const incharges = staff.filter((s) => s.role === 'Incharge' || !s.role);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div>
      {/* Staff Info */}
      <div className="card mb-4">
        <h2 className="section-title">👨‍💼 Staff Information</h2>
        <div className="mb-4">
          <label className="form-label">Lane Inspector <span className="text-red-500">*</span></label>
          <select value={form.lane_inspector} onChange={(e) => set('lane_inspector', e.target.value)} className="form-input">
            <option value="">Select Inspector</option>
            {inspectors.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="form-label">Lane Incharge <span className="text-red-500">*</span></label>
          <select value={form.lane_incharge} onChange={(e) => set('lane_incharge', e.target.value)} className="form-input">
            <option value="">Select Incharge</option>
            {incharges.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="form-label">Remarks</label>
          <textarea
            value={form.remarks}
            onChange={(e) => set('remarks', e.target.value)}
            className="form-input"
            rows={3}
            placeholder="Add any remarks here..."
          />
        </div>
      </div>

      {/* Feedback */}
      <div className="card mb-4">
        <h2 className="section-title">⭐ Customer Feedback</h2>
        <div className="flex gap-3">
          {['Bad', 'Good', 'Excellent'].map((opt) => {
            const icons = { Bad: '😞', Good: '😊', Excellent: '🌟' };
            const colors = {
              Bad: 'border-red-400 bg-red-50 text-red-600',
              Good: 'border-yellow-400 bg-yellow-50 text-yellow-700',
              Excellent: 'border-green-500 bg-green-50 text-green-700',
            };
            return (
              <button
                key={opt}
                type="button"
                onClick={() => set('feedback', opt)}
                className={`flex-1 py-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all active:scale-95
                  ${form.feedback === opt ? colors[opt] : 'border-gray-200 bg-gray-50 text-gray-400'}`}
              >
                <span className="text-2xl">{icons[opt]}</span>
                {opt}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Customer signature & thumb print will be collected at the counter</p>
      </div>

      {/* Disclaimer */}
      <div className="card mb-4">
        <h2 className="section-title">📜 Disclaimer</h2>
        <ul className="space-y-2">
          {DISCLAIMER_POINTS.map((point, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-600">
              <span className="text-blue-500 font-bold mt-0.5 shrink-0">{i + 1}.</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button
          type="button"
          onClick={() => onSubmit(form)}
          disabled={loading || !form.lane_inspector || !form.lane_incharge}
          className="btn-success"
        >
          {loading ? 'Submitting...' : '✅ Submit for Review'}
        </button>
      </div>
    </div>
  );
}
