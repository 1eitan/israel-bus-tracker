import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { isValidCoord } from '../lib/geo';
import type { UserLocation } from '../types/bus';

/** תאימות לאחור: denied = נדחה (אפשר לבקש שוב), blocked = נדחה סופית (רק דרך הגדרות המכשיר) */
export type LocationPermission = 'unknown' | 'granted' | 'denied' | 'blocked';

/**
 * idle      - עוד לא התחלנו / הוק לא פעיל
 * locating  - מחפשים מיקום (ייתכן שכבר יש מיקום אחרון ידוע)
 * ready     - יש מיקום
 * denied    - ההרשאה נדחתה (אפשר לבקש שוב)
 * blocked   - ההרשאה חסומה (פתיחת הגדרות)
 * disabled  - שירותי המיקום (GPS) כבויים במכשיר
 * timeout   - לא התקבל מיקום בזמן
 * error     - כשל אחר
 */
export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'blocked' | 'disabled' | 'timeout' | 'error';

export interface LocationState {
  status: LocationStatus;
  permission: LocationPermission;
  location: UserLocation | null;
  /** דיוק גרוע (> COARSE_ACCURACY_M) - כדאי להציג הערה בממשק */
  coarse: boolean;
  /** בקשת הרשאה יזומה (לחיצה על כפתור). מחזיר true אם ניתנה. */
  requestPermission: () => Promise<boolean>;
  /** ניסיון איתור חוזר (אחרי timeout/error/הפעלת GPS) */
  retry: () => void;
  /** פתיחת הגדרות האפליקציה/המכשיר (למצבי blocked/disabled) */
  openSettings: () => void;
}

/** כמה זמן מחכים לפיקס ראשון לפני שמדווחים timeout */
export const FIRST_FIX_TIMEOUT_MS = 15000;
/** מעל זה המיקום נחשב לא מדויק */
export const COARSE_ACCURACY_M = 100;
/** פיקס גרוע יותר מזה נזרק אם כבר יש לנו מיקום */
const MAX_ACCEPTED_ACCURACY_M = 2000;
/** מיקום אחרון ידוע שמוכן להציג מיד, כל עוד הוא לא ישן/גס מדי */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_M = 500;

const RECOVERABLE: ReadonlySet<LocationStatus> = new Set(['denied', 'blocked', 'disabled', 'timeout', 'error']);

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * מיקום המשתמש בזמן אמת (expo-location) עם טיפול מלא במצבי קצה:
 * הרשאה (denied/blocked), GPS כבוי, timeout, דיוק גרוע, חזרה מההגדרות,
 * וניקוי מלא של ה-watcher ב-unmount / כשהאפליקציה עוברת לרקע (active=false).
 */
export function useLocation(active = true): LocationState {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [granted, setGranted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  const statusRef = useRef<LocationStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const openSettings = useCallback(() => {
    void Linking.openSettings().catch(() => undefined);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const response = await Location.requestForegroundPermissionsAsync();
      if (response.status === 'granted') {
        if (mounted.current) {
          setGranted(true);
          setAttempt((n) => n + 1);
        }
        return true;
      }
      if (mounted.current) setStatus(response.canAskAgain ? 'denied' : 'blocked');
    } catch {
      if (mounted.current) setStatus('error');
    }
    return false;
  }, []);

  // חזרה מהגדרות המכשיר: אם היינו במצב בעייתי - בודקים שוב אוטומטית
  useEffect(() => {
    if (!active) return undefined;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && RECOVERABLE.has(statusRef.current)) setAttempt((n) => n + 1);
    });
    return () => subscription.remove();
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const accept = (coords: Location.LocationObjectCoords): void => {
      if (cancelled) return;
      const { latitude: lat, longitude: lon } = coords;
      if (!isValidCoord(lat, lon)) return;
      const accuracy = coords.accuracy ?? 0;
      setLocation((previous) => (previous && accuracy > MAX_ACCEPTED_ACCURACY_M ? previous : { lat, lon, accuracy }));
      setStatus('ready');
    };

    (async () => {
      setStatus((previous) => (previous === 'ready' ? previous : 'locating'));

      try {
        // 1. שירותי מיקום (GPS) כבויים במכשיר
        if (!(await Location.hasServicesEnabledAsync())) {
          if (!cancelled) setStatus('disabled');
          return;
        }

        // 2. הרשאה. מבקשים אוטומטית רק בפעם הראשונה (undetermined); אחרי דחייה מחכים ללחיצת משתמש.
        let permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission.status === 'undetermined') {
          permission = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;
        }
        if (permission.status !== 'granted') {
          setGranted(false);
          setStatus(permission.canAskAgain ? 'denied' : 'blocked');
          return;
        }
        setGranted(true);

        // 3. מיקום אחרון ידוע - מציגים מיד, בזמן שמחכים לפיקס טרי
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
          requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M
        }).catch(() => null);
        if (cancelled) return;
        if (lastKnown) accept(lastKnown.coords);

        // 4. פיקס טרי עם timeout. כישלון כאן לא עוצר את ה-watcher: ייתכן שיגיע מיקום בהמשך.
        try {
          const current = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            FIRST_FIX_TIMEOUT_MS
          );
          accept(current.coords);
        } catch (error) {
          if (cancelled) return;
          if (!lastKnown) setStatus(error instanceof TimeoutError ? 'timeout' : 'error');
        }
        if (cancelled) return;

        // 5. מעקב רציף. אם ה-unmount קרה בזמן ההמתנה - מסירים מיד, לא משאירים watcher יתום.
        const watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
          (position) => accept(position.coords)
        );
        if (cancelled) {
          watcher.remove();
          return;
        }
        subscription = watcher;
      } catch {
        if (!cancelled) setStatus((previous) => (previous === 'ready' ? previous : 'error'));
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      subscription = null;
    };
  }, [active, attempt]);

  return {
    status,
    permission: status === 'denied' || status === 'blocked' ? status : granted ? 'granted' : 'unknown',
    location,
    coarse: location !== null && location.accuracy > COARSE_ACCURACY_M,
    requestPermission,
    retry,
    openSettings
  };
}
