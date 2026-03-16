export default function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-between mb-6 no-print">
      {steps.map((step, idx) => {
        const num = idx + 1;
        const done = num < currentStep;
        const active = num === currentStep;
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {done ? '✓' : num}
              </div>
              <span className={`text-xs mt-1 text-center leading-tight px-1
                ${active ? 'text-blue-600 font-semibold' : done ? 'text-green-600' : 'text-gray-400'}`}>
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
