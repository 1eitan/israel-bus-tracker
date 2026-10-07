import { API_BASE, API_CONFIGURED, REQUEST_TIMEOUT_MS } from './config';
import type {
  Arrival,
  RouteDetails,
  RouteSummary,
  SearchResults,
  Stop,
  StopArrivalsResponse,
  VehicleUpcomingResponse
} from '../types/bus';

export type ApiErrorKind = 'http' | 'timeout' | 'network' | 'parse' | 'config';

/** שגיאת API מסווגת - React Query משתמש ב-status/kind כדי להחליט אם לנסות שוב. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status: number = 0
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** שגיאת לקוח (4xx) לא תתוקן בניסיון חוזר - חוץ מ-408/429 */
  get retryable(): boolean {
    // שגיאת קונפיגורציה (כתובת שרת חסרה) לא תיפתר בניסיון חוזר
    if (this.kind === 'config') return false;
    if (this.kind !== 'http') return true;
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!API_CONFIGURED) throw new ApiError('כתובת השרת לא הוגדרה', 'config');
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new ApiError(`הבקשה נכשלה (${response.status})`, 'http', response.status);
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError('תשובת השרת אינה תקינה', 'parse');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // ביטול יזום (unmount / שינוי key) - לא שגיאה אמיתית, React Query מתעלם ממנו
    if (signal?.aborted && !timedOut) throw error;
    if (timedOut) throw new ApiError('השרת לא הגיב בזמן', 'timeout');
    throw new ApiError('אין תקשורת עם השרת', 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
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
export const fetchVehicleUpcoming = (id: string, signal?: AbortSignal) =>
  getJson<VehicleUpcomingResponse>(`/api/vehicles/${encodeURIComponent(id)}/upcoming`, signal);
