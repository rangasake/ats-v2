import { useState, useRef, useEffect } from 'react';

export default function SearchableDropdown({ label, options, value, onChange, placeholder, required }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(opt) {
    onChange(opt);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="mb-4 relative" ref={ref}>
      {label && <label className="form-label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      <div
        className="form-input flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || placeholder || 'Select...'}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50
                    ${value === opt ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
