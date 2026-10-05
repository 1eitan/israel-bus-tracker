import { fetchNearby, type NearbyResponse } from '../lib/api';
import { NEARBY_POLL_MS, NEARBY_RADIUS_M } from '../lib/config';
import type { UserLocation } from '../types/bus';
import { usePolling } from './usePolling';

/**
 * תחנות קרובות + זמני הגעה חיים מהשרת. ה-key מעוגל (~110 מ׳) כדי לא לאפס
 * את ה-polling על כל תזוזת GPS קטנה.
 */
export function useNearbyStops(location: UserLocation | null, active: boolean) {
  const key = location ? `${location.lat.toFixed(3)},${location.lon.toFixed(3)}` : 'none';
  return usePolling<NearbyResponse>(
    (signal) => fetchNearby(location!.lat, location!.lon, NEARBY_RADIUS_M, signal),
    active && location !== null,
    NEARBY_POLL_MS,
    key
  );
}
