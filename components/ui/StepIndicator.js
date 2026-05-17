export default function StepIndicator({ currentStep, steps }) {
  const pct = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
  return (
    <div className="mb-6 no-print">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Step dots + labels */}
      <div className="flex items-start justify-between">
        {steps.map((step, idx) => {
          const num = idx + 1;
          const done = num < currentStep;
          const active = num === currentStep;
          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}
              >
                {done ? '✓' : num}
              </div>
              <span className={`text-[10px] mt-1 text-center leading-tight px-0.5
                ${active ? 'text-blue-600 font-bold' : done ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
