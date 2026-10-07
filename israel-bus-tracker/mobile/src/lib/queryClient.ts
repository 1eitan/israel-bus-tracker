import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import { AppState } from 'react-native';

import { ApiError } from './api';

const HOUR_MS = 60 * 60 * 1000;
const MAX_RETRIES = 3;

/** מצב רשת אמיתי (NetInfo): כשאין רשת השאילתות נעצרות (paused) ולא נכשלות, והנתונים האחרונים נשארים על המסך. */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    // isInternetReachable הוא null עד שנבדק - לא מתייחסים אליו כאל "אין רשת"
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  })
);

/** חזרה מהרקע = "focus": שאילתות ישנות מתרעננות מיד. מחזיר פונקציית ניקוי. */
export function subscribeAppFocus(): () => void {
  const subscription = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
  return () => subscription.remove();
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  return error instanceof ApiError ? error.retryable : true;
}

/** 1s, 2s, 4s... עד 8s, עם jitter כדי שלא כל המכשירים יתחברו שוב באותה שנייה */
function retryDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 8000);
  return base / 2 + Math.random() * (base / 2);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      staleTime: 10_000,
      // חייב להיות >= maxAge של ה-persister, אחרת המטמון נמחק לפני ששוחזר
      gcTime: 24 * HOUR_MS,
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: true
    }
  }
});

/** רק נתונים שהגיוני להציג במצב לא-מקוון נשמרים לדיסק. חיפוש וגיליונות פרטי-רכב לא. */
const PERSISTED_KEYS = new Set(['routes', 'route', 'nearby', 'stopArrivals']);

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister: createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'bus-tracker-query-cache-v1',
    throttleTime: 2000
  }),
  maxAge: 24 * HOUR_MS,
  // לשנות כשמבנה התשובות של ה-API משתנה: מבטל מטמון ישן
  buster: '1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && PERSISTED_KEYS.has(String(query.queryKey[0]))
  }
};
