import { badRequest } from './errors';

/** כל הפונקציות כאן טהורות (ללא תלות ב-Express) וזורקות AppError(400) בקלט לא תקין */

const MAX_ID_LENGTH = 128;
const MAX_QUERY_LENGTH = 100;
export const MAX_ROUTE_FILTER = 50;

function single(name: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw badRequest(`הפרמטר ${name} חייב להופיע פעם אחת כמחרוזת`);
  return value;
}

/** מספר סופי. מחרוזת ריקה אינה 0 (Number('') === 0 הוא באג נפוץ). */
function finiteNumber(name: string, raw: string): number {
  if (raw.trim() === '') throw badRequest(`הפרמטר ${name} ריק`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw badRequest(`הפרמטר ${name} חייב להיות מספר`);
  return value;
}

export function parseLatLon(query: Record<string, unknown>): { lat: number; lon: number } {
  const rawLat = single('lat', query.lat);
  const rawLon = single('lon', query.lon);
  if (rawLat === undefined || rawLon === undefined) throw badRequest('חסרים פרמטרים lat ו-lon');
  const lat = finiteNumber('lat', rawLat);
  const lon = finiteNumber('lon', rawLon);
  if (lat < -90 || lat > 90) throw badRequest('lat חייב להיות בטווח -90 עד 90');
  if (lon < -180 || lon > 180) throw badRequest('lon חייב להיות בטווח -180 עד 180');
  return { lat, lon };
}

/** מספר שלם אופציונלי: חסר => ברירת מחדל; לא מספרי => 400; מחוץ לטווח => מוגבל לטווח */
export function parseClampedInt(
  name: string,
  value: unknown,
  opts: { min: number; max: number; fallback: number }
): number {
  const raw = single(name, value);
  if (raw === undefined || raw === '') return opts.fallback;
  const parsed = finiteNumber(name, raw);
  return Math.min(opts.max, Math.max(opts.min, Math.round(parsed)));
}

export function parseId(name: string, value: unknown): string {
  const id = single(name, value)?.trim() ?? '';
  if (id === '') throw badRequest(`הפרמטר ${name} חסר`);
  if (id.length > MAX_ID_LENGTH) throw badRequest(`הפרמטר ${name} ארוך מדי`);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f/\\]/.test(id)) throw badRequest(`הפרמטר ${name} מכיל תווים אסורים`);
  return id;
}

export function parseSearchQuery(value: unknown): string {
  const q = single('q', value)?.trim() ?? '';
  if (q.length > MAX_QUERY_LENGTH) throw badRequest(`q ארוך מדי (מקסימום ${MAX_QUERY_LENGTH} תווים)`);
  return q;
}

/** רשימת מזהי קווים מופרדת בפסיקים (למשל ?routes=1,2,3) */
export function parseRouteIdList(value: unknown): string[] {
  const raw = single('routes', value);
  if (raw === undefined || raw.trim() === '') return [];
  const ids = [...new Set(raw.split(',').map((v) => v.trim()).filter(Boolean))];
  if (ids.length > MAX_ROUTE_FILTER) throw badRequest(`ניתן לבקש עד ${MAX_ROUTE_FILTER} קווים`);
  for (const id of ids) parseId('routes', id);
  return ids;
}

/** רשימת מזהי קווים מ-payload של Socket.io. לא זורק - מחזיר רשימה מסוננת. */
export function sanitizeSocketRouteIds(payload: unknown): string[] {
  const list = (payload as { routeIds?: unknown } | null | undefined)?.routeIds;
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const item of list) {
    if (typeof item === 'string' && item.length > 0 && item.length <= MAX_ID_LENGTH) out.add(item);
    if (out.size >= MAX_ROUTE_FILTER) break;
  }
  return [...out];
}
