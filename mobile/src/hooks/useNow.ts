import { useEffect, useState } from 'react';

/** מחזיר Date.now() שמתעדכן כל intervalMs - לספירה לאחור חלקה של ETA בין תשובות שרת */
export function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
