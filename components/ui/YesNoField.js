import DateInput from './DateInput';

export default function YesNoField({ label, value, onChange, dateValue, onDateChange, dateLabel, required }) {
  return (
    <div className="mb-4">
      <label className="form-label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <div className="flex gap-3">
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all active:scale-95
              ${value === opt
                ? opt === 'Yes'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-red-400 bg-red-50 text-red-600'
                : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
          >
            {opt === 'Yes' ? '✅ Yes' : '❌ No'}
          </button>
        ))}
      </div>
      {onDateChange && (
        <div className="mt-2">
          <label className="form-label text-xs">{dateLabel || 'Expiry Date'}</label>
          <DateInput
            value={dateValue || ''}
            onChange={(e) => onDateChange(e.target.value)}
            className="form-input text-sm"
          />
        </div>
      )}
    </div>
  );
}
