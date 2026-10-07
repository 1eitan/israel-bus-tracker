import { ok, type Outcome } from '../core/outcome';
import { haversine } from '../lib/geo';
import type { Itinerary, PlannerCapabilities, RoutePlannerProvider, RouteQuery } from './types';

const WALK_MPS = 1.25;
const BUS_MPS = 5.5;
const WALK_TO_STOP_M = 200;

export interface MockPlannerOptions {
  now?: () => number;
  /** מדמה כשל (לבדיקות / מצבי שגיאה ב-UI) */
  failWith?: Outcome<Itinerary[]>;
  /** מדמה "אין מסלולים" */
  empty?: boolean;
}

/**
 * מתכנן הדגמה: קו ישר בין שתי נקודות עם הליכה + "נסיעה" סינתטית. אין כאן נתוני תחבורה ציבורית.
 * כל מסלול נושא source='mock' ו-isMock=true; ה-UI מסמן "הדגמה - לא מסלול אמיתי".
 * נוצר רק בבנייה לפיתוח (providers/factory), לעולם לא ב-release.
 */
export class MockRoutePlannerProvider implements RoutePlannerProvider {
  readonly id = 'routing.mock';
  readonly isMock = true;
  readonly requiresNetwork = false;
  readonly capabilities: PlannerCapabilities = {
    realTime: false,
    disruptions: true,
    arriveBy: true,
    walkingPreference: false,
    transferLimit: false
  };
  private readonly now: () => number;

  constructor(private readonly options: MockPlannerOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  async plan(query: RouteQuery): Promise<Outcome<Itinerary[]>> {
    if (this.options.failWith) return this.options.failWith;
    if (this.options.empty) return ok([]);

    const total = haversine(query.origin, query.destination);
    const walkEach = Math.min(WALK_TO_STOP_M, total / 4);
    const busDistance = Math.max(0, total - 2 * walkEach);
    const walkSec = Math.round(walkEach / WALK_MPS);
    const busSec = Math.round(busDistance / BUS_MPS);
    const durationSec = walkSec * 2 + busSec;

    const now = this.now();
    const start =
      query.time.mode === 'depart_now'
        ? now
        : query.time.mode === 'depart_at'
          ? query.time.at
          : query.time.at - durationSec * 1000;

    const t1 = start + walkSec * 1000;
    const t2 = t1 + busSec * 1000;
    const end = t2 + walkSec * 1000;
    const stopA = { lat: query.origin.lat, lon: query.origin.lon };
    const stopB = { lat: query.destination.lat, lon: query.destination.lon };

    const itinerary: Itinerary = {
      id: `mock-${start}`,
      source: 'mock',
      startTime: start,
      endTime: end,
      durationSec,
      distanceM: Math.round(total),
      walkingDistanceM: Math.round(walkEach * 2),
      walkingDurationSec: walkSec * 2,
      transfers: 0,
      realTime: false,
      disruptions: [{ id: 'mock-d1', severity: 'info', message: 'הדגמה: אין כאן נתוני תחבורה אמיתיים', legIndex: 1 }],
      legs: [
        { type: 'walk', from: query.origin, to: stopA, distanceM: Math.round(walkEach), durationSec: walkSec },
        {
          type: 'bus',
          routeShortName: 'דמו',
          from: stopA,
          to: stopB,
          departure: t1,
          arrival: t2,
          distanceM: Math.round(busDistance)
        },
        { type: 'walk', from: stopB, to: query.destination, distanceM: Math.round(walkEach), durationSec: walkSec }
      ]
    };
    return ok([itinerary]);
  }
}
