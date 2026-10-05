import { useEffect, useRef, useState } from 'react';

export interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

/**
 * מריץ fetcher מיד וכל intervalMs בזמן ש-enabled=true.
 * כשהמפתח (key) משתנה, הנתונים מתאפסים והמשיכה מתחילה מחדש.
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  intervalMs: number,
  key: string
): PollingState<T> {
  const [state, setState] = useState<PollingState<T>>({ data: null, loading: enabled, error: false });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    setState({ data: null, loading: enabled, error: false });
    if (!enabled) return undefined;

    let cancelled = false;
    let timer: number | undefined;
    const controller = new AbortController();

    const run = async (): Promise<void> => {
      try {
        const result = await fetcherRef.current(controller.signal);
        if (!cancelled) setState({ data: result, loading: false, error: false });
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setState((previous) => ({ data: previous.data, loading: false, error: true }));
        }
      } finally {
        if (!cancelled) timer = window.setTimeout(run, intervalMs);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled, intervalMs, key]);

  return state;
}
