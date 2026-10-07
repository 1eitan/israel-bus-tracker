import { createPersistedStore, type KeyValueStore, type PersistedStore } from '../core/store';
import { isValidCoord } from '../lib/geo';
import { normalizeKey } from '../history/recents';
import type { Stop } from '../types/bus';

export type PlaceIcon = 'home' | 'star' | 'briefcase' | 'location';

export interface FavoritePlace {
  id: string;
  title: string;
  subtitle?: string;
  icon: PlaceIcon;
  lat?: number;
  lon?: number;
}

export const FAVORITES_KEY = 'bus.favorites.v1';
export const FAVORITE_STOPS_KEY = 'bus.favoriteStops.v1';
export const FAVORITE_ROUTES_KEY = 'bus.favoriteRoutes.v1';
export const MAX_FAVORITE_PLACES = 50;
export const MAX_FAVORITE_STOPS = 100;
export const MAX_FAVORITE_ROUTES = 100;

/**
 * ערכי ברירת מחדל משלב 1 (מבוקשים בעיצוב). אינם נתוני אמת של המשתמש;
 * נשמרים רק אחרי שהמשתמש עורך. "בית" ללא כתובת.
 */
export const DEFAULT_FAVORITES: readonly FavoritePlace[] = [
  { id: 'fav-home', title: 'בית', subtitle: 'הוסף כתובת', icon: 'home' },
  { id: 'fav-oren', title: 'אורן משי - שכונת הפארק', icon: 'star' },
  { id: 'fav-ikea', title: 'איקאה / יגאל אלון', icon: 'star' }
];

const ICONS: ReadonlySet<string> = new Set(['home', 'star', 'briefcase', 'location']);

export function addFavoritePlace(
  list: readonly FavoritePlace[],
  input: { title: string; subtitle?: string; icon?: PlaceIcon; lat?: number; lon?: number }
): FavoritePlace[] {
  const title = input.title.replace(/\s+/g, ' ').trim().slice(0, 120);
  const key = normalizeKey(title);
  if (!key) return list as FavoritePlace[];
  const existing = list.find((p) => normalizeKey(p.title) === key);
  const hasCoords = input.lat !== undefined && input.lon !== undefined && isValidCoord(input.lat, input.lon);
  if (existing) {
    // כבר קיים: משלימים קואורדינטות חסרות, לא יוצרים כפילות
    if (!hasCoords || existing.lat !== undefined) return list as FavoritePlace[];
    return list.map((p) => (p.id === existing.id ? { ...p, lat: input.lat, lon: input.lon } : p));
  }
  if (list.length >= MAX_FAVORITE_PLACES) return list as FavoritePlace[];
  const place: FavoritePlace = {
    id: `place:${key}`,
    title,
    subtitle: input.subtitle?.trim() || undefined,
    icon: input.icon ?? 'star',
    lat: hasCoords ? input.lat : undefined,
    lon: hasCoords ? input.lon : undefined
  };
  return [...list, place];
}

export const removeFavoritePlace = (list: readonly FavoritePlace[], id: string): FavoritePlace[] =>
  list.some((p) => p.id === id) ? list.filter((p) => p.id !== id) : (list as FavoritePlace[]);

/** מוסיף אם לא קיים, מסיר (לפי כותרת מנורמלת) אם קיים. */
export function toggleFavoritePlace(
  list: readonly FavoritePlace[],
  input: Parameters<typeof addFavoritePlace>[1]
): FavoritePlace[] {
  const key = normalizeKey(input.title);
  if (key && list.some((p) => normalizeKey(p.title) === key)) return list.filter((p) => normalizeKey(p.title) !== key);
  return addFavoritePlace(list, input);
}

export const isFavoritePlace = (list: readonly FavoritePlace[], title: string): boolean => {
  const key = normalizeKey(title);
  return key.length > 0 && list.some((p) => normalizeKey(p.title) === key);
};

/** שחזור מאחסון (כולל פורמט שלב 1). מערך ריק תקין (המשתמש מחק הכול). לא-מערך נדחה. */
export function sanitizeFavoritePlaces(raw: unknown): FavoritePlace[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: FavoritePlace[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.title !== 'string') continue;
    const key = normalizeKey(r.title);
    if (!key || seen.has(r.id)) continue;
    seen.add(r.id);
    const lat = typeof r.lat === 'number' ? r.lat : undefined;
    const lon = typeof r.lon === 'number' ? r.lon : undefined;
    const coords = lat !== undefined && lon !== undefined && isValidCoord(lat, lon);
    out.push({
      id: r.id,
      title: r.title.replace(/\s+/g, ' ').trim().slice(0, 120),
      subtitle: typeof r.subtitle === 'string' && r.subtitle.trim() ? r.subtitle.trim() : undefined,
      icon: typeof r.icon === 'string' && ICONS.has(r.icon) ? (r.icon as PlaceIcon) : 'star',
      lat: coords ? lat : undefined,
      lon: coords ? lon : undefined
    });
  }
  return out.slice(0, MAX_FAVORITE_PLACES);
}

/** ---------- תחנות וקווים מועדפים ---------- */

export function toggleFavoriteStop(list: readonly Stop[], stop: Stop): Stop[] {
  if (list.some((s) => s.id === stop.id)) return list.filter((s) => s.id !== stop.id);
  if (!stop.id || !isValidCoord(stop.lat, stop.lon) || list.length >= MAX_FAVORITE_STOPS) return list as Stop[];
  return [...list, stop];
}

export function sanitizeFavoriteStops(raw: unknown): Stop[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: Stop[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    if (typeof s.id !== 'string' || typeof s.name !== 'string' || typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
    if (seen.has(s.id) || !isValidCoord(s.lat, s.lon)) continue;
    seen.add(s.id);
    out.push({ id: s.id, code: typeof s.code === 'string' ? s.code : '', name: s.name, lat: s.lat, lon: s.lon });
  }
  return out.slice(0, MAX_FAVORITE_STOPS);
}

export function toggleFavoriteRoute(list: readonly string[], id: string): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (!id || list.length >= MAX_FAVORITE_ROUTES) return list as string[];
  return [...list, id];
}

export function sanitizeFavoriteRoutes(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0))].slice(0, MAX_FAVORITE_ROUTES);
}

export interface FavoriteStores {
  places: PersistedStore<FavoritePlace[]>;
  stops: PersistedStore<Stop[]>;
  routes: PersistedStore<string[]>;
}

export function createFavoriteStores(kv: KeyValueStore): FavoriteStores {
  return {
    places: createPersistedStore<FavoritePlace[]>({
      key: FAVORITES_KEY,
      kv,
      initial: [...DEFAULT_FAVORITES],
      sanitize: sanitizeFavoritePlaces
    }),
    stops: createPersistedStore<Stop[]>({ key: FAVORITE_STOPS_KEY, kv, initial: [], sanitize: sanitizeFavoriteStops }),
    routes: createPersistedStore<string[]>({ key: FAVORITE_ROUTES_KEY, kv, initial: [], sanitize: sanitizeFavoriteRoutes })
  };
}
