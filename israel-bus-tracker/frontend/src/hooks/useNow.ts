import { useEffect, useState } from 'react';

/** מחזיר את הזמן הנוכחי (מילישניות) ומתעדכן כל intervalMs */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
