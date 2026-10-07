import { fail, ok, type Outcome } from '../core/outcome';
import { isValidCoord } from '../lib/geo';
import type { Waypoint } from './types';

export interface ResolveDeps {
  /** geocoding של המכשיר; מחזיר null אם לא נמצא */
  geocode: (text: string) => Promise<{ lat: number; lon: number } | null>;
  /** מיקום נוכחי אם כבר יש הרשאה ומיקום; null אם אין (לא מבקש הרשאה בעצמו) */
  currentLocation: () => Promise<{ lat: number; lon: number } | null>;
}

export const MAX_PLACE_TEXT = 120;

/**
 * הופך טקסט שהמשתמש הקליד (או ריק = המיקום הנוכחי) לנקודה.
 * ריק + אין מיקום => שגיאת קלט; לא ממציאים נקודה.
 */
export async function resolveWaypoint(
  text: string,
  role: 'origin' | 'destination',
  deps: ResolveDeps
): Promise<Outcome<Waypoint>> {
  const clean = text.trim().slice(0, MAX_PLACE_TEXT);
  if (clean.length === 0) {
    if (role === 'destination') return fail('invalid_input', 'destination empty', 'הזן יעד.');
    const here = await deps.currentLocation().catch(() => null);
    if (here && isValidCoord(here.lat, here.lon)) return ok({ lat: here.lat, lon: here.lon, label: 'המיקום שלי' });
    return fail('invalid_input', 'origin empty and no location', 'הזן נקודת מוצא, או אפשר גישה למיקום.');
  }
  let found: { lat: number; lon: number } | null;
  try {
    found = await deps.geocode(clean);
  } catch (error) {
    return fail('network', error instanceof Error ? error.message : String(error), 'חיפוש הכתובת נכשל. בדוק חיבור לאינטרנט.');
  }
  if (!found || !isValidCoord(found.lat, found.lon)) {
    return fail('invalid_input', 'geocode returned nothing', `לא נמצא מיקום עבור "${clean}".`);
  }
  return ok({ lat: found.lat, lon: found.lon, label: clean });
}
