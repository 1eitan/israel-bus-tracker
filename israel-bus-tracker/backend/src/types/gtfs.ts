/**
 * הגדרות טיפוסים מלאות עבור נתוני GTFS ו-GTFS-Realtime
 * כפי שהשרת משתמש בהם בזיכרון ובממשק ה-API / WebSocket.
 */

export interface LatLng {
  lat: number;
  lon: number;
}

/** תחנה (GTFS stops.txt) */
export interface Stop {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
}

/** קו (GTFS routes.txt) כולל מסלול (shape) ורשימת תחנות מסודרת */
export interface Route {
  id: string;
  shortName: string;
  longName: string;
  agency: string;
  color: string;
  textColor: string;
  /** מזהי התחנות בכיוון 0 לפי הסדר */
  stopIds: string[];
  /** נקודות המסלול בכיוון 0 */
  shape: LatLng[];
}

/** תקציר קו (ללא shape) */
export interface RouteSummary {
  id: string;
  shortName: string;
  longName: string;
  agency: string;
  color: string;
  textColor: string;
}

/** קו מלא עם אובייקטי תחנות מפורטים */
export interface RouteDetails extends RouteSummary {
  shape: LatLng[];
  stops: Stop[];
}

/** נתוני GTFS סטטיים */
export interface StaticGtfsData {
  routes: Route[];
  stops: Stop[];
}

/** מיקום רכב בזמן אמת (GTFS-RT VehiclePosition) */
export interface VehiclePosition {
  /** מזהה רכב ייחודי */
  id: string;
  /** מספר רכב להצגה */
  label: string;
  routeId: string;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  headsign: string;
  tripId: string;
  directionId: 0 | 1;
  lat: number;
  lon: number;
  /** כיוון נסיעה במעלות (0 = צפון) */
  bearing: number;
  /** מהירות בקמ"ש */
  speedKmh: number;
  /** חותמת זמן של המיקום (שניות Unix) */
  timestamp: number;
  /** עיכוב בשניות (שלילי = מקדים) */
  delaySeconds: number;
  nextStopId: string | null;
}

/** עדכון זמן הגעה לתחנה בודדת (GTFS-RT StopTimeUpdate) */
export interface StopTimeUpdate {
  stopId: string;
  stopSequence: number;
  /** זמן הגעה צפוי (שניות Unix) */
  arrivalTime: number;
  delaySeconds: number;
}

/** עדכון נסיעה (GTFS-RT TripUpdate) */
export interface TripUpdate {
  tripId: string;
  routeId: string;
  vehicleId: string | null;
  headsign: string;
  delaySeconds: number;
  /** חותמת זמן (שניות Unix) */
  timestamp: number;
  stopTimeUpdates: StopTimeUpdate[];
}

/** הגעה צפויה של קו לתחנה */
export interface Arrival {
  routeId: string;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  headsign: string;
  tripId: string;
  vehicleId: string | null;
  /** זמן הגעה צפוי (שניות Unix) */
  arrivalTime: number;
  delaySeconds: number;
  /** דקות עד ההגעה (מעוגל כלפי מעלה, 0 = ממש עכשיו) */
  minutes: number;
}

/** תחנה קרובה ברכב מסוים עם זמן הגעה */
export interface UpcomingStop {
  stop: Stop;
  stopSequence: number;
  arrivalTime: number;
  delaySeconds: number;
  minutes: number;
}

/** תוצאת חיפוש */
export interface SearchResults {
  routes: RouteSummary[];
  stops: Stop[];
}

/** סטטוס השירות */
export interface ServiceStatus {
  mode: 'demo' | 'live';
  ok: boolean;
  lastFetchAt: number | null;
  lastError: string | null;
  vehicleCount: number;
}

/** אירועי Socket.io מהשרת ללקוח */
export interface ServerToClientEvents {
  snapshot: (payload: { vehicles: VehiclePosition[]; serverTime: number }) => void;
  'vehicles:update': (payload: { vehicles: VehiclePosition[]; serverTime: number }) => void;
  'vehicles:remove': (payload: { ids: string[] }) => void;
  'server:status': (payload: ServiceStatus) => void;
}

/** אירועי Socket.io מהלקוח לשרת */
export interface ClientToServerEvents {
  subscribe: (payload: { routeIds: string[] }) => void;
}

export const ALL_ROUTES_ROOM_KEY = '*';
