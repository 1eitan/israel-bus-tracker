import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BusInfoDrawer from './components/BusInfoDrawer';
import Header from './components/Header';
import BusMap from './components/Map';
import SearchBar from './components/SearchBar';
import { useTheme } from './hooks/useTheme';
import { useVehicleSocket } from './hooks/useVehicleSocket';
import { fetchRouteDetails, fetchRoutes, fetchStops } from './lib/api';
import {
  ALL_ROUTES,
  type MapFocus,
  type RouteDetails,
  type RouteSummary,
  type Stop,
  type UserLocation
} from './types/bus';

const RETRY_DELAY_MS = 3000;
const MISSING_VEHICLE_GRACE_MS = 8000;

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [routeDetails, setRouteDetails] = useState<Record<string, RouteDetails>>({});
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const nonceRef = useRef(0);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const socketRouteIds = useMemo(
    () => (selectedRouteIds.length > 0 ? selectedRouteIds : [ALL_ROUTES]),
    [selectedRouteIds]
  );
  const { status, vehicles: vehicleMap, serverStatus } = useVehicleSocket(socketRouteIds);
  const vehicles = useMemo(() => Object.values(vehicleMap), [vehicleMap]);

  /* ------------------------------- עזרים ------------------------------- */

  const nextNonce = useCallback((): number => {
    nonceRef.current += 1;
    return nonceRef.current;
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  /* ------------------------- טעינה ראשונית (עם ניסיון חוזר) ------------------------- */

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const controller = new AbortController();

    const load = async (): Promise<void> => {
      try {
        const [routesData, stopsData] = await Promise.all([
          fetchRoutes(controller.signal),
          fetchStops(controller.signal)
        ]);
        if (cancelled) return;
        setRoutes(routesData);
        setStops(stopsData);
      } catch {
        if (!cancelled) timer = window.setTimeout(load, RETRY_DELAY_MS);
      }
    };

    void load();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  /* -------------------------------- בחירת קווים -------------------------------- */

  const loadRouteDetails = useCallback(
    async (routeId: string): Promise<RouteDetails | null> => {
      try {
        const details = await fetchRouteDetails(routeId);
        setRouteDetails((previous) => ({ ...previous, [routeId]: details }));
        return details;
      } catch {
        showToast('לא הצלחנו לטעון את מסלול הקו. נסה שוב.');
        return null;
      }
    },
    [showToast]
  );

  const handleSelectRoute = useCallback(
    async (route: RouteSummary): Promise<void> => {
      setSelectedRouteIds((previous) => (previous.includes(route.id) ? previous : [...previous, route.id]));

      const existing = routeDetails[route.id];
      let details: RouteDetails | null = existing ?? null;
      if (!details) {
        details = await loadRouteDetails(route.id);
      }
      if (!details) return;

      const points: [number, number][] = details.shape.map((point) => [point.lat, point.lon]);
      if (points.length > 0) {
        setFocus({ kind: 'bounds', points, nonce: nextNonce() });
      }
    },
    [loadRouteDetails, nextNonce, routeDetails]
  );

  const handleRemoveRoute = useCallback(
    (routeId: string) => {
      setSelectedRouteIds((previous) => previous.filter((id) => id !== routeId));
      setSelectedVehicleId((current) => {
        if (!current) return current;
        const vehicle = vehicleMap[current];
        return vehicle && vehicle.routeId === routeId ? null : current;
      });
    },
    [vehicleMap]
  );

  const handleClearRoutes = useCallback(() => {
    setSelectedRouteIds([]);
  }, []);

  /* ------------------------------ בחירת רכב / תחנה ------------------------------ */

  const handleSelectVehicle = useCallback(
    (id: string) => {
      const vehicle = vehicleMap[id];
      setSelectedVehicleId(id);
      setSelectedStopId(null);
      if (vehicle) {
        setFocus({ kind: 'point', lat: vehicle.lat, lon: vehicle.lon, zoom: 15, nonce: nextNonce() });
      }
    },
    [nextNonce, vehicleMap]
  );

  const focusStop = useCallback(
    (stop: Stop) => {
      setSelectedStopId(stop.id);
      setSelectedVehicleId(null);
      setFocus({ kind: 'point', lat: stop.lat, lon: stop.lon, zoom: 16, nonce: nextNonce() });
    },
    [nextNonce]
  );

  const handleSelectStopById = useCallback(
    (stopId: string) => {
      const stop = stops.find((candidate) => candidate.id === stopId);
      if (stop) focusStop(stop);
    },
    [focusStop, stops]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedVehicleId(null);
    setSelectedStopId(null);
  }, []);

  /* ------------------------------- המיקום שלי ------------------------------- */

  const handleLocate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      showToast('הדפדפן שלך לא תומך באיתור מיקום.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: UserLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(location);
        setFocus({ kind: 'point', lat: location.lat, lon: location.lon, zoom: 16, nonce: nextNonce() });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          showToast('אין הרשאה לגשת למיקום. אפשר להפעיל אותה בהגדרות הדפדפן.');
        } else if (error.code === error.TIMEOUT) {
          showToast('איתור המיקום לקח יותר מדי זמן. נסה שוב.');
        } else {
          showToast('לא הצלחנו לאתר את המיקום שלך.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }, [nextNonce, showToast]);

  /* --------------------------- נגזרות לתצוגה --------------------------- */

  const selectedVehicle = selectedVehicleId ? (vehicleMap[selectedVehicleId] ?? null) : null;
  const selectedStop = selectedStopId
    ? (stops.find((stop) => stop.id === selectedStopId) ?? null)
    : null;

  const drawerMode: 'bus' | 'stop' | null = selectedVehicle ? 'bus' : selectedStop ? 'stop' : null;

  /* רכב שנבחר ונעלם מהנתונים: סוגרים את הפאנל אחרי זמן חסד */
  useEffect(() => {
    if (!selectedVehicleId || selectedVehicle) return undefined;
    const timer = window.setTimeout(() => {
      setSelectedVehicleId(null);
      showToast('הרכב שנבחר אינו מדווח כרגע.');
    }, MISSING_VEHICLE_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [selectedVehicle, selectedVehicleId, showToast]);

  /* סגירה במקש Escape */
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSelectedVehicleId(null);
        setSelectedStopId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedRouteSummaries = useMemo(
    () =>
      selectedRouteIds
        .map((id) => routes.find((route) => route.id === id) ?? routeDetails[id])
        .filter((route): route is RouteSummary => Boolean(route)),
    [selectedRouteIds, routes, routeDetails]
  );

  const visibleRouteDetails = useMemo(
    () =>
      selectedRouteIds
        .map((id) => routeDetails[id])
        .filter((details): details is RouteDetails => Boolean(details)),
    [selectedRouteIds, routeDetails]
  );

  const handleSearchStop = useCallback(
    (stop: Stop) => {
      focusStop(stop);
    },
    [focusStop]
  );

  const handleSearchRoute = useCallback(
    (route: RouteSummary) => {
      void handleSelectRoute(route);
    },
    [handleSelectRoute]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      <BusMap
        theme={theme}
        vehicles={vehicles}
        routes={visibleRouteDetails}
        stops={stops}
        selectedVehicleId={selectedVehicleId}
        selectedStopId={selectedStopId}
        focus={focus}
        userLocation={userLocation}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStopById}
        onClearSelection={handleClearSelection}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-3 md:inset-x-auto md:right-3 md:w-[400px]">
        <div className="pointer-events-auto flex flex-col gap-2">
          <Header
            status={status}
            vehicleCount={vehicles.length}
            demoMode={serverStatus?.mode === 'demo'}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <SearchBar
            selectedRoutes={selectedRouteSummaries}
            locating={locating}
            onSelectRoute={handleSearchRoute}
            onSelectStop={handleSearchStop}
            onRemoveRoute={handleRemoveRoute}
            onClearRoutes={handleClearRoutes}
            onLocate={handleLocate}
          />
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            role="alert"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="glass pointer-events-none absolute inset-x-4 top-[10.5rem] z-[1300] mx-auto flex max-w-sm items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold md:inset-x-auto md:left-4 md:top-4 md:mx-0"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {drawerMode && (
          <BusInfoDrawer
            key={drawerMode}
            mode={drawerMode}
            vehicle={selectedVehicle}
            stop={selectedStop}
            onClose={handleClearSelection}
            onSelectVehicle={handleSelectVehicle}
            onSelectStop={handleSelectStopById}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
