import { useEffect, useState, useSyncExternalStore } from 'react';
import { TimeStore } from '../services/time-store';

export function useCurrentTime(store: TimeStore): number {
  return useSyncExternalStore(store.subscribe, store.get);
}

export function useThrottledCurrentTime(
  store: TimeStore,
  intervalMs = 100,
): number {
  const [time, setTime] = useState(() => store.get());

  useEffect(() => {
    let lastEmit = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      lastEmit = performance.now();
      timeout = undefined;
      setTime(store.get());
    };
    const unsubscribe = store.subscribe(() => {
      if (timeout !== undefined) {
        return;
      }

      const elapsed = performance.now() - lastEmit;

      if (elapsed >= intervalMs) {
        flush();
      } else {
        timeout = setTimeout(flush, intervalMs - elapsed);
      }
    });

    return () => {
      unsubscribe();

      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    };
  }, [store, intervalMs]);

  return time;
}
