import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

import { fetchNearby, type NearbyResponse } from '../lib/api';
import { NEARBY_POLL_MS, NEARBY_RADIUS_M } from '../lib/config';
import { isValidCoord } from '../lib/geo';
import { rankNearbyStops } from '../lib/nearby';
import type { UserLocation } from '../types/bus';
import { toQueryState, type QueryState } from './queries';

/** תחנות רחוקות מכך (פי 2 מהרדיוס) הן נתונים ישנים ממיקום קודם - לא מציגים */
const MAX_DISTANCE_M = NEARBY_RADIUS_M * 2;

/**
 * תחנות קרובות + זמני הגעה חיים.
 * - השרת מחזיר תחנות סביב הנקודה שנשלחה; ה-queryKey מעוגל (~110 מ׳) כדי שתזוזת GPS קטנה
 *   לא תשגר בקשה חדשה, ו-polling רץ כל 15 שנ׳.
 * - המרחק והמיון מחושבים מחדש מהמיקום האמיתי העדכני בכל עדכון GPS (rankNearbyStops).
 * - ב-offline מוצגים הנתונים האחרונים (נשמרים לדיסק).
 */
export function useNearbyStops(location: UserLocation | null, active: boolean): QueryState<NearbyResponse> {
  const valid = location !== null && isValidCoord(location.lat, location.lon);
  const latest = useRef(location);
  latest.current = location;

  const key = valid ? `${location.lat.toFixed(3)},${location.lon.toFixed(3)}` : 'none';

  const query = useQuery({
    queryKey: ['nearby', key, NEARBY_RADIUS_M],
    queryFn: ({ signal }) => {
      // המיקום המדויק ביותר ברגע הבקשה, לא הערך המעוגל מה-key
      const current = latest.current;
      if (!current) throw new Error('no location');
      return fetchNearby(current.lat, current.lon, NEARBY_RADIUS_M, signal);
    },
    enabled: active && valid,
    refetchInterval: active && valid ? NEARBY_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: NEARBY_POLL_MS / 2,
    // בזמן מעבר ל-key חדש (זזנו) ממשיכים להציג את הרשימה הקודמת במקום להבהב
    placeholderData: keepPreviousData
  });

  const state = toQueryState(query);

  const lat = valid ? location.lat : null;
  const lon = valid ? location.lon : null;
  const data = useMemo<NearbyResponse | null>(() => {
    if (!query.data || lat === null || lon === null) return null;
    return { ...query.data, stops: rankNearbyStops(query.data.stops, { lat, lon }, MAX_DISTANCE_M) };
  }, [query.data, lat, lon]);

  return { ...state, data };
}
