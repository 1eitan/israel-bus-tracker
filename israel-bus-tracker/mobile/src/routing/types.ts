import type { Outcome } from '../core/outcome';

/**
 * ארכיטקטורת Route Planner.
 *
 * ה-UI מדבר רק עם RoutePlannerProvider. מנוע אמיתי (OpenTripPlanner, Google Directions, שרת פנימי...)
 * ממומש כ-RealRoutePlannerProvider. בלי מנוע: NOT_IMPLEMENTED. מסלול שמקורו ב-Mock נושא source='mock'
 * וה-UI חייב לסמן אותו כהדגמה - אסור להציג אותו כמסלול אמיתי.
 */
export interface Waypoint {
  lat: number;
  lon: number;
  label?: string;
}

export type TimeSpec =
  | { mode: 'depart_now' }
  | { mode: 'depart_at'; at: number } // epoch ms
  | { mode: 'arrive_by'; at: number };

export interface RoutePreferences {
  /** תקרת הליכה במטרים (סך הכול) */
  maxWalkMeters?: number;
  /** מספר החלפות מרבי */
  maxTransfers?: number;
  modes?: Array<'bus' | 'walk'>;
}

export interface RouteQuery {
  origin: Waypoint;
  destination: Waypoint;
  time: TimeSpec;
  preferences?: RoutePreferences;
}

export interface WalkLeg {
  type: 'walk';
  from: Waypoint;
  to: Waypoint;
  distanceM: number;
  durationSec: number;
}

export interface BusLeg {
  type: 'bus';
  routeShortName: string;
  headsign?: string;
  from: Waypoint & { stopId?: string };
  to: Waypoint & { stopId?: string };
  departure: number;
  arrival: number;
  distanceM: number;
  /** עיכוב בזמן אמת בשניות; undefined = אין נתון זמן אמת */
  delaySec?: number;
}

export type Leg = WalkLeg | BusLeg;

export interface Disruption {
  id: string;
  severity: 'info' | 'warning' | 'severe';
  message: string;
  /** אינדקס ה-leg המושפע, אם ידוע */
  legIndex?: number;
}

export interface Itinerary {
  id: string;
  /** 'real' רק ממנוע אמיתי. 'mock' = הדגמה, חובה לסמן ב-UI */
  source: 'real' | 'mock';
  startTime: number;
  endTime: number;
  durationSec: number;
  distanceM: number;
  walkingDistanceM: number;
  walkingDurationSec: number;
  transfers: number;
  legs: Leg[];
  /** האם הנתונים כוללים זמן אמת */
  realTime: boolean;
  disruptions: Disruption[];
}

export interface PlannerCapabilities {
  realTime: boolean;
  disruptions: boolean;
  arriveBy: boolean;
  walkingPreference: boolean;
  transferLimit: boolean;
}

export const NO_CAPABILITIES: PlannerCapabilities = {
  realTime: false,
  disruptions: false,
  arriveBy: false,
  walkingPreference: false,
  transferLimit: false
};

export interface PlanOptions {
  signal?: AbortSignal;
}

export interface RoutePlannerProvider {
  readonly id: string;
  readonly isMock: boolean;
  /** האם הספק מדבר עם רשת (קובע אם offline חוסם) */
  readonly requiresNetwork: boolean;
  readonly capabilities: PlannerCapabilities;
  plan(query: RouteQuery, options?: PlanOptions): Promise<Outcome<Itinerary[]>>;
}

export interface RoutePlannerConfig {
  baseUrl: string;
}

export interface RealRoutePlannerProvider extends RoutePlannerProvider {
  readonly isMock: false;
  readonly engine: string;
  configure(config: RoutePlannerConfig): Promise<Outcome<void>>;
}
