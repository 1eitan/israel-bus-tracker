import { resolveApiConfig } from './url';

// ה-process.env.EXPO_PUBLIC_* חייבים להופיע כביטוי מלא כדי ש-Metro יטמיע אותם בבנדל.
const resolved = resolveApiConfig({
  api: process.env.EXPO_PUBLIC_API_URL,
  socket: process.env.EXPO_PUBLIC_SOCKET_URL,
  isDev: __DEV__
});

/** כתובת בסיס ל-REST. ריקה אם לא הוגדרה / לא תקינה (ראה API_CONFIG_PROBLEM). */
export const API_BASE = resolved.apiBase;
export const SOCKET_URL = resolved.socketUrl;
/** false ב-release בלי EXPO_PUBLIC_API_URL תקין (https). אז אין בקשות רשת והממשק מציג שגיאה/ריק. */
export const API_CONFIGURED = resolved.configured;
export const API_CONFIG_PROBLEM = resolved.problem;

export const NEARBY_RADIUS_M = 500;
export const NEARBY_POLL_MS = 15000;
export const ARRIVALS_POLL_MS = 15000;
export const REQUEST_TIMEOUT_MS = 10000;

/**
 * providers של הדגמה (Mock) מופעלים *רק* בבנייה לפיתוח (`__DEV__`) *ובנוסף* עם דגל מפורש.
 * ב-release הערך תמיד false, ולכן משתמש אמיתי לעולם לא יראה הצלחת תשלום / מסלול / התחברות מדומים.
 */
export const USE_MOCK_PROVIDERS = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_PROVIDERS === '1';
