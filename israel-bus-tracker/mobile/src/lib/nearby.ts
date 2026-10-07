import { haversine, isValidCoord } from './geo';

interface StopLike {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/**
 * מחשב מחדש את המרחק של כל תחנה מהמיקום *הנוכחי* של המשתמש וממיין מהקרובה לרחוקה.
 * השרת מחשב מרחק מהנקודה שנשלחה בבקשה; עד לבקשה הבאה המשתמש כבר זז, ולכן המרחק
 * והסדר מחושבים כאן מחדש. תחנות עם קואורדינטות לא תקינות, כפולות, או רחוקות מ-maxDistanceM
 * (למשל נתונים ישנים שנשארו מהמיקום הקודם) מסוננות.
 */
export function rankNearbyStops<T extends { stop: StopLike; distanceM: number }>(
  items: readonly T[],
  origin: { lat: number; lon: number },
  maxDistanceM = Number.POSITIVE_INFINITY
): T[] {
  if (!isValidCoord(origin.lat, origin.lon)) return [];
  const seen = new Set<string>();
  const ranked: T[] = [];
  for (const item of items) {
    const { stop } = item;
    if (seen.has(stop.id) || !isValidCoord(stop.lat, stop.lon)) continue;
    seen.add(stop.id);
    const distanceM = Math.round(haversine(origin, stop));
    if (distanceM > maxDistanceM) continue;
    ranked.push({ ...item, distanceM });
  }
  return ranked.sort((a, b) => a.distanceM - b.distanceM || a.stop.name.localeCompare(b.stop.name, 'he'));
}
