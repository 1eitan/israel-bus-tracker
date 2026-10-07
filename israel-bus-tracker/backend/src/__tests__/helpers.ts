import { EventEmitter } from 'events';

import type { AppConfig } from '../config';
import type { VehiclePosition } from '../types/gtfs';

export const testConfig = {
  port: 0,
  corsOrigin: ['*'],
  demoMode: false,
  vehiclePositionsUrl: '',
  tripUpdatesUrl: '',
  siriSmUrl: '',
  siriKey: '',
  siriKeyParam: 'Key',
  siriKeyHeader: '',
  siriMinRefreshMs: 10000,
  siriHotStopTtlMs: 120000,
  siriWarmStopIds: [],
  apiKey: '',
  apiKeyHeader: 'x-api-key',
  apiKeyParam: '',
  staticDataPath: '',
  requestTimeoutMs: 1000,
  pollIntervalMs: 3000,
  vehicleStaleMs: 120000
} as AppConfig;

export function vehicle(id: string, routeId: string, lat = 32.08): VehiclePosition {
  return {
    id, label: id, routeId, routeShortName: routeId, routeColor: '#112233', routeTextColor: '#ffffff',
    headsign: 'x', tripId: `t-${id}`, directionId: 0, lat, lon: 34.78, bearing: 0, speedKmh: 0,
    timestamp: 1, delaySeconds: 0, nextStopId: null
  };
}

/** fetcher מדומה: EventEmitter עם מצב רכבים (מקור אמת יחיד לפי id) */
export class FakeFetcher extends EventEmitter {
  vehicles = new Map<string, VehiclePosition>();
  stops = [{ id: 'S1', code: '1', name: 'תחנה', lat: 32.08, lon: 34.78 }];
  refreshed: string[] = [];
  getStatus() { return { mode: 'demo' as const, ok: true, lastFetchAt: 1, lastError: null, vehicleCount: this.vehicles.size }; }
  getProviders() { return { marker: 'providers' } as never; }
  getRouteSummaries() { return [{ id: 'R1' }] as never; }
  getRouteDetails(id: string) { return id === 'R1' ? ({ id: 'R1', stops: [], shape: [] } as never) : undefined; }
  getStops() { return this.stops; }
  getStop(id: string) { return this.stops.find((s) => s.id === id); }
  getNearbyStops() { return this.stops.map((stop) => ({ stop, distanceM: 10 })); }
  getArrivalsForStop() { return []; }
  async refreshStop(id: string) { this.refreshed.push(id); }
  getVehicles(routeIds?: string[]) {
    const all = [...this.vehicles.values()];
    return routeIds && routeIds.length ? all.filter((v) => routeIds.includes(v.routeId)) : all;
  }
  getVehicle(id: string) { return this.vehicles.get(id); }
  getUpcomingForVehicle() { return []; }
  search(q: string) { return { routes: [], stops: q ? this.stops : [] }; }
}
