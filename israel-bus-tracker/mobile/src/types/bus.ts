export type Theme = 'light' | 'dark';

export interface LatLng {
  lat: number;
  lon: number;
}

export interface Stop {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export interface RouteSummary {
  id: string;
  shortName: string;
  longName: string;
  agency: string;
  color: string;
  textColor: string;
}

export interface RouteDetails extends RouteSummary {
  shape: LatLng[];
  stops: Stop[];
}

export interface Vehicle {
  id: string;
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
  bearing: number;
  speedKmh: number;
  timestamp: number;
  delaySeconds: number;
  nextStopId: string | null;
}

export interface Arrival {
  routeId: string;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  headsign: string;
  tripId: string;
  vehicleId: string | null;
  arrivalTime: number;
  delaySeconds: number;
  minutes: number;
}

export interface UpcomingStop {
  stop: Stop;
  stopSequence: number;
  arrivalTime: number;
  delaySeconds: number;
  minutes: number;
}

export interface StopArrivalsResponse {
  stop: Stop;
  arrivals: Arrival[];
  serverTime: number;
}

export interface VehicleUpcomingResponse {
  vehicle: Vehicle;
  upcoming: UpcomingStop[];
  serverTime: number;
}

export interface SearchResults {
  routes: RouteSummary[];
  stops: Stop[];
}

export interface ServiceStatus {
  mode: 'demo' | 'live';
  ok: boolean;
  lastFetchAt: number | null;
  lastError: string | null;
  vehicleCount: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface UserLocation {
  lat: number;
  lon: number;
  accuracy: number;
}

export type MapFocus =
  | { kind: 'point'; lat: number; lon: number; zoom?: number; nonce: number }
  | { kind: 'bounds'; points: [number, number][]; nonce: number };

export type DrawerMode = 'bus' | 'stop' | null;

export const ALL_ROUTES = '*';
