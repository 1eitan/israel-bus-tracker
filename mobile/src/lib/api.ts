import { API_BASE } from './config';
import type {
  Arrival,
  RouteDetails,
  RouteSummary,
  SearchResults,
  Stop,
  StopArrivalsResponse
} from '../types/bus';

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`הבקשה נכשלה (${response.status})`);
  return (await response.json()) as T;
}

export interface NearbyStop {
  stop: Stop;
  distanceM: number;
  arrivals: Arrival[];
}

export interface NearbyResponse {
  stops: NearbyStop[];
  serverTime: number;
}

export const fetchRoutes = (signal?: AbortSignal) => getJson<RouteSummary[]>('/api/routes', signal);
export const fetchRouteDetails = (id: string, signal?: AbortSignal) =>
  getJson<RouteDetails>(`/api/routes/${encodeURIComponent(id)}`, signal);
export const fetchStopArrivals = (id: string, signal?: AbortSignal) =>
  getJson<StopArrivalsResponse>(`/api/stops/${encodeURIComponent(id)}/arrivals`, signal);
export const searchAll = (query: string, signal?: AbortSignal) =>
  getJson<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`, signal);
export const fetchNearby = (lat: number, lon: number, radius: number, signal?: AbortSignal) =>
  getJson<NearbyResponse>(`/api/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}&limit=8`, signal);
