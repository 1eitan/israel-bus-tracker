import type {
  RouteDetails,
  RouteSummary,
  SearchResults,
  ServiceStatus,
  Stop,
  StopArrivalsResponse,
  VehicleUpcomingResponse
} from '../types/bus';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`הבקשה נכשלה (${response.status})`);
  }
  return (await response.json()) as T;
}

export function fetchRoutes(signal?: AbortSignal): Promise<RouteSummary[]> {
  return getJson<RouteSummary[]>('/api/routes', signal);
}

export function fetchRouteDetails(id: string, signal?: AbortSignal): Promise<RouteDetails> {
  return getJson<RouteDetails>(`/api/routes/${encodeURIComponent(id)}`, signal);
}

export function fetchStops(signal?: AbortSignal): Promise<Stop[]> {
  return getJson<Stop[]>('/api/stops', signal);
}

export function fetchStopArrivals(id: string, signal?: AbortSignal): Promise<StopArrivalsResponse> {
  return getJson<StopArrivalsResponse>(`/api/stops/${encodeURIComponent(id)}/arrivals`, signal);
}

export function fetchVehicleUpcoming(
  id: string,
  signal?: AbortSignal
): Promise<VehicleUpcomingResponse> {
  return getJson<VehicleUpcomingResponse>(`/api/vehicles/${encodeURIComponent(id)}/upcoming`, signal);
}

export function searchAll(query: string, signal?: AbortSignal): Promise<SearchResults> {
  return getJson<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`, signal);
}

export function fetchHealth(signal?: AbortSignal): Promise<ServiceStatus> {
  return getJson<ServiceStatus>('/api/health', signal);
}
