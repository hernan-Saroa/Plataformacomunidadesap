import { useEffect } from 'react';

export const CORRECTION_REFRESH_INTERVAL = 5000;

/** Refresh only the visible view, without overlapping requests or late updates. */
export function useCorrectionAutoRefresh(
  refresh: (isCurrent: () => boolean) => Promise<void>,
  enabled = true,
  immediate = true,
) {
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      if (!disposed) timer = setTimeout(() => void run(), CORRECTION_REFRESH_INTERVAL);
    };
    const run = async () => {
      if (disposed || running) return;
      clearTimeout(timer);
      if (document.visibilityState === 'hidden' || navigator.onLine === false) {
        schedule();
        return;
      }
      running = true;
      try {
        await refresh(() => !disposed);
      } catch {
        // A temporary failure must not stop subsequent synchronization attempts.
      } finally {
        running = false;
        schedule();
      }
    };

    const resume = () => { void run(); };
    if (immediate) void run();
    else schedule();
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [enabled, immediate, refresh]);
}
