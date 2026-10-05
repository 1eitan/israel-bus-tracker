import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { UserLocation } from '../types/bus';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

/** מיקום המשתמש בזמן אמת (expo-location). מתעדכן אחרי תזוזה של ~25 מטר. */
export function useLocation(active = true) {
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [location, setLocation] = useState<UserLocation | null>(null);

  const request = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      if (!(await request()) || cancelled) return;
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setLocation({ lat: current.coords.latitude, lon: current.coords.longitude, accuracy: current.coords.accuracy ?? 0 });
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
          (position) =>
            setLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy ?? 0
            })
        );
      } catch {
        /* GPS כבוי או לא זמין - נשארים בלי מיקום */
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active, request]);

  return { permission, location, requestPermission: request };
}
