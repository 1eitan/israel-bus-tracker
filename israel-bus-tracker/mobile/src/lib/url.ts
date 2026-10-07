/**
 * פתרון כתובות השרת (API + Socket) - לוגיקה טהורה, נבדקת ב-tests/url.test.ts.
 *
 * הכללים:
 *  - פיתוח (__DEV__): אם לא הוגדר משתנה סביבה, ברירת המחדל היא http://localhost:4000.
 *  - release: אין ברירת מחדל. כתובת חסרה או לא תקינה => configured=false (האפליקציה לא מנסה לפנות לשום מקום).
 *  - release: http:// (cleartext) נחסם. אנדרואיד (targetSdk >= 28) ו-iOS (ATS) חוסמים אותו בכל מקרה,
 *    ועדיף להגיד זאת במפורש מאשר להיכשל בשקט.
 */
export type ApiConfigProblem = 'missing' | 'invalid' | 'cleartext';

export interface ApiConfig {
  apiBase: string;
  socketUrl: string;
  configured: boolean;
  problem: ApiConfigProblem | null;
}

export const DEV_DEFAULT_API = 'http://localhost:4000';

const HTTP_URL = /^(https?):\/\/[^\s/?#@]+(\/[^\s?#]*)?$/i;

const stripSlashes = (value: string): string => value.trim().replace(/\/+$/, '');

export const isHttpUrl = (value: string): boolean => HTTP_URL.test(value);
export const isCleartext = (value: string): boolean => /^http:\/\//i.test(value);

interface Input {
  api: string | undefined;
  socket: string | undefined;
  isDev: boolean;
}

export function resolveApiConfig({ api, socket, isDev }: Input): ApiConfig {
  // `||` ולא `??`: משתנה סביבה ריק (למשל מ-CI) נחשב כלא מוגדר.
  const rawApi = stripSlashes(api || (isDev ? DEV_DEFAULT_API : ''));
  const rawSocket = stripSlashes(socket || rawApi);

  const check = (value: string): ApiConfigProblem | null => {
    if (!value) return 'missing';
    if (!isHttpUrl(value)) return 'invalid';
    if (!isDev && isCleartext(value)) return 'cleartext';
    return null;
  };

  const problem = check(rawApi) ?? check(rawSocket);
  return {
    apiBase: problem ? '' : rawApi,
    socketUrl: problem ? '' : rawSocket,
    configured: problem === null,
    problem
  };
}
