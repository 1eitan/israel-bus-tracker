import { failure, type AppFailure } from '../core/outcome';
import { haversine, isValidCoord } from '../lib/geo';
import type { Itinerary, RouteQuery, Waypoint } from './types';

export const MIN_TRIP_DISTANCE_M = 30;
/** ניתן לתכנן עד שבוע קדימה */
export const MAX_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;
/** סטייה קטנה אחורה מותרת (שעון/הקלדה) */
export const PAST_TOLERANCE_MS = 5 * 60 * 1000;

const invalid = (cause: string, message: string): AppFailure => failure('invalid_input', cause, message);

function checkWaypoint(point: Waypoint, name: string, label: string): AppFailure | null {
  if (!point || !isValidCoord(point.lat, point.lon)) return invalid(`${name} coordinates invalid`, `${label} אינה תקינה.`);
  return null;
}

/** מחזיר AppFailure אם השאילתה אינה תקינה, אחרת null. */
export function validateRouteQuery(query: RouteQuery, now: number): AppFailure | null {
  const origin = checkWaypoint(query.origin, 'origin', 'נקודת המוצא');
  if (origin) return origin;
  const destination = checkWaypoint(query.destination, 'destination', 'נקודת היעד');
  if (destination) return destination;
  if (haversine(query.origin, query.destination) < MIN_TRIP_DISTANCE_M) {
    return invalid('origin equals destination', 'המוצא והיעד קרובים מדי זה לזה.');
  }

  const { time } = query;
  if (time.mode !== 'depart_now') {
    if (!Number.isFinite(time.at)) return invalid('time is not a number', 'הזמן שנבחר אינו תקין.');
    if (time.at > now + MAX_HORIZON_MS) return invalid('time too far ahead', 'אפשר לתכנן עד שבוע קדימה.');
    if (time.mode === 'arrive_by' && time.at <= now) return invalid('arrive_by in the past', 'זמן ההגעה חייב להיות בעתיד.');
    if (time.mode === 'depart_at' && time.at < now - PAST_TOLERANCE_MS) {
      return invalid('depart_at in the past', 'זמן היציאה כבר עבר.');
    }
  }

  const { preferences: p } = query;
  if (p) {
    if (p.maxTransfers !== undefined && (!Number.isInteger(p.maxTransfers) || p.maxTransfers < 0 || p.maxTransfers > 5)) {
      return invalid('maxTransfers out of range', 'מספר ההחלפות חייב להיות בין 0 ל-5.');
    }
    if (p.maxWalkMeters !== undefined && (!Number.isFinite(p.maxWalkMeters) || p.maxWalkMeters < 0 || p.maxWalkMeters > 5000)) {
      return invalid('maxWalkMeters out of range', 'מרחק ההליכה חייב להיות בין 0 ל-5,000 מטר.');
    }
  }
  return null;
}

/**
 * בדיקת שפיות לתשובה ממנוע: מסלול שמפר אינווריאנטים (זמן שלילי, אין legs, סיום לפני התחלה)
 * לא מוצג למשתמש. מחזיר סיבה או null.
 */
export function findItineraryProblem(it: Itinerary): string | null {
  if (!it || !Array.isArray(it.legs) || it.legs.length === 0) return 'no legs';
  if (it.source !== 'real' && it.source !== 'mock') return 'missing source';
  for (const n of [it.startTime, it.endTime, it.durationSec, it.distanceM, it.walkingDistanceM, it.walkingDurationSec, it.transfers]) {
    if (!Number.isFinite(n)) return 'non-finite number';
  }
  if (it.durationSec < 0 || it.distanceM < 0 || it.walkingDistanceM < 0 || it.transfers < 0) return 'negative value';
  if (it.endTime < it.startTime) return 'end before start';
  return null;
}
