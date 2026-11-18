import { useEffect, useRef, useCallback } from 'react';

/**
 * Smart Visibility-Aware Polling Hook for Serverless Real-Time Sync
 * 
 * Features:
 * - Runs sync function every interval (default: 18,000 ms / 18s).
 * - Pauses automatically when the browser tab is hidden or backgrounded (document.hidden).
 * - Resumes automatically and immediately syncs when tab becomes visible again.
 * - Pauses when the user goes offline and resumes when back online.
 * - Guards against overlapping concurrent sync requests.
 * 
 * @param {Function} syncCallback - Callback function to invoke on sync
 * @param {object} options
 * @param {number} [options.intervalMs=18000] - Polling interval in ms (default 18 seconds)
 * @param {boolean} [options.enabled=true] - Master toggle to enable/disable polling
 * @param {boolean} [options.syncOnVisible=true] - Whether to sync immediately upon returning to tab
 * @param {boolean} [options.immediate=false] - Whether to invoke immediately on mount
 */
export function useSmartSync(syncCallback, options = {}) {
  const {
    intervalMs = 18000,
    enabled = true,
    syncOnVisible = true,
    immediate = false
  } = options;

  const callbackRef = useRef(syncCallback);
  const isExecutingRef = useRef(false);
  const timerRef = useRef(null);

  // Keep callback reference updated without restarting timer
  useEffect(() => {
    callbackRef.current = syncCallback;
  }, [syncCallback]);

  const triggerSync = useCallback(async (source = 'interval') => {
    if (!enabled || typeof callbackRef.current !== 'function') return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    try {
      await callbackRef.current(source);
    } catch (err) {
      console.debug('[SmartSync] Sync failed gracefully:', err?.message || err);
    } finally {
      isExecutingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (immediate) {
      triggerSync('immediate');
    }

    // Set up polling interval
    timerRef.current = setInterval(() => {
      triggerSync('interval');
    }, intervalMs);

    // Handle visibility changes (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (syncOnVisible) {
          triggerSync('visibility_resume');
        }
      }
    };

    // Handle network status changes
    const handleOnline = () => {
      triggerSync('network_online');
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [enabled, intervalMs, syncOnVisible, immediate, triggerSync]);

  return {
    syncNow: () => triggerSync('manual')
  };
}

export default useSmartSync;
