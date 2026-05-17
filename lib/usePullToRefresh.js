// lib/usePullToRefresh.js
// Touch-based pull-to-refresh hook.
// Fires `onRefresh` (async) when the user pulls down ≥ threshold px from the top of the page.
import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 72; // px of pull needed to trigger

export function usePullToRefresh(onRefresh) {
  const [state, setState] = useState('idle'); // 'idle' | 'pulling' | 'refreshing'
  const startY   = useRef(null);
  const pullDist = useRef(0);

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pullDist.current = 0;
      }
    }

    function onTouchMove(e) {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        pullDist.current = Math.min(delta, THRESHOLD * 1.8);
        setState(pullDist.current >= THRESHOLD ? 'pulling' : 'idle');
      }
    }

    async function onTouchEnd() {
      if (pullDist.current >= THRESHOLD) {
        setState('refreshing');
        try {
          await onRefresh();
        } finally {
          setState('idle');
        }
      } else {
        setState('idle');
      }
      startY.current  = null;
      pullDist.current = 0;
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: true });
    document.addEventListener('touchend',   onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [onRefresh]);

  return state; // 'idle' | 'pulling' | 'refreshing'
}
