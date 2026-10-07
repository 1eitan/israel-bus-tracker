import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchRouteDetails,
  fetchRoutes,
  fetchStopArrivals,
  fetchVehicleUpcoming,
  searchAll
} from '../lib/api';
import { ARRIVALS_POLL_MS } from '../lib/config';

export const queryKeys = {
  routes: ['routes'] as const,
  route: (id: string) => ['route', id] as const,
  stopArrivals: (id: string) => ['stopArrivals', id] as const,
  vehicleUpcoming: (id: string) => ['vehicleUpcoming', id] as const,
  search: (q: string) => ['search', q] as const
};

/** צורת התוצאה שכל המסכים משתמשים בה (תואמת ל-usePolling הישן, בתוספת offline/updatedAt) */
export interface QueryState<T> {
  data: T | null;
  /** טעינה ראשונית: אין נתונים ועדיין מנסים */
  loading: boolean;
  /** רענון כשכבר יש נתונים על המסך */
  refreshing: boolean;
  /** נכשל אחרי כל הניסיונות, או שאין רשת ואין נתונים שמורים */
  error: boolean;
  /** אין רשת: השאילתה מושהית */
  offline: boolean;
  /** זמן העדכון האחרון של הנתונים (ms), 0 אם אין */
  updatedAt: number;
  refresh: () => void;
}

export function toQueryState<T>(query: UseQueryResult<T>): QueryState<T> {
  const data = query.data ?? null;
  const paused = query.fetchStatus === 'paused';
  return {
    data,
    loading: data === null && !query.isError && !paused,
    refreshing: data !== null && query.isFetching,
    error: query.isError || (data === null && paused),
    offline: paused,
    updatedAt: query.dataUpdatedAt,
    refresh: () => {
      void query.refetch();
    }
  };
}

/** polling מושהה כשהאפליקציה ברקע / הלשונית לא פעילה (active=false) */
const pollingOptions = (active: boolean) => ({
  enabled: active,
  refetchInterval: active ? ARRIVALS_POLL_MS : (false as const),
  refetchIntervalInBackground: false,
  staleTime: ARRIVALS_POLL_MS / 2
});

export function useStopArrivals(stopId: string, active: boolean): QueryState<Awaited<ReturnType<typeof fetchStopArrivals>>> {
  return toQueryState(
    useQuery({
      queryKey: queryKeys.stopArrivals(stopId),
      queryFn: ({ signal }) => fetchStopArrivals(stopId, signal),
      ...pollingOptions(active)
    })
  );
}

export function useVehicleUpcoming(vehicleId: string, active: boolean): QueryState<Awaited<ReturnType<typeof fetchVehicleUpcoming>>> {
  return toQueryState(
    useQuery({
      queryKey: queryKeys.vehicleUpcoming(vehicleId),
      queryFn: ({ signal }) => fetchVehicleUpcoming(vehicleId, signal),
      ...pollingOptions(active)
    })
  );
}

/** רשימת קווים: משתנה לאט, לכן staleTime ארוך ובלי polling. נשמרת לדיסק לשימוש לא-מקוון. */
export function useRoutes(enabled: boolean): QueryState<Awaited<ReturnType<typeof fetchRoutes>>> {
  return toQueryState(
    useQuery({
      queryKey: queryKeys.routes,
      queryFn: ({ signal }) => fetchRoutes(signal),
      enabled,
      staleTime: 5 * 60_000
    })
  );
}

/** פרטי קו + shape + תחנות (לציור קו המסלול). undefined = אין קו נבחר. */
export function useRouteDetails(routeId: string | undefined): QueryState<Awaited<ReturnType<typeof fetchRouteDetails>>> {
  return toQueryState(
    useQuery({
      queryKey: queryKeys.route(routeId ?? ''),
      queryFn: ({ signal }) => fetchRouteDetails(routeId!, signal),
      enabled: !!routeId,
      staleTime: 10 * 60_000
    })
  );
}

/** חיפוש תחנה/קו. השאילתה כבר debounced אצל הקורא; פחות מ-2 תווים = לא מחפשים. */
export function useSearch(query: string): QueryState<Awaited<ReturnType<typeof searchAll>>> {
  return toQueryState(
    useQuery({
      queryKey: queryKeys.search(query),
      queryFn: ({ signal }) => searchAll(query, signal),
      enabled: query.length >= 2,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1
    })
  );
}
