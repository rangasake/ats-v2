// lib/ToastContext.js — lightweight toast notification system
import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const COLORS = {
  success: 'bg-green-600',
  error:   'bg-red-600',
  warning: 'bg-orange-500',
  info:    'bg-gray-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Toast container — sits above the bottom nav */}
      <div className="fixed bottom-20 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 text-sm font-semibold text-white cursor-pointer active:scale-95 transition-all ${COLORS[t.type]}`}
          >
            <span className="text-base shrink-0">{ICONS[t.type]}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <span className="text-white/60 text-lg leading-none">&times;</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Returns a toast(message, type, duration?) function */
export function useToast() {
  return useContext(ToastCtx);
}
