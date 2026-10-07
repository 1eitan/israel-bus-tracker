import { createPersistedStore, type KeyValueStore, type PersistedStore } from '../core/store';
import { isValidCoord } from '../lib/geo';

export interface RecentSearch {
  /** נגזר מהכותרת המנורמלת - יציב, ומשמש גם לאי-כפילות */
  id: string;
  title: string;
  subtitle?: string;
  lat?: number;
  lon?: number;
  searchedAt: number;
}

export interface RecentInput {
  title: string;
  subtitle?: string;
  lat?: number;
  lon?: number;
}

export const RECENTS_KEY = 'bus.recents.v1';
export const MAX_RECENTS = 10;
export const MAX_TITLE_LENGTH = 120;

/** ערכי "ברירת מחדל" מזויפים משלב 1 (חיפושים שלא בוצעו מעולם). נמחקים אם נשארו באחסון. */
const LEGACY_FAKE_IDS: ReadonlySet<string> = new Set(['rec-1', 'rec-2']);

/** מפתח השוואה: NFKC, בלי ניקוד עברי, רווחים מכווצים, אותיות קטנות */
export function normalizeKey(title: string): string {
  return title
    .normalize('NFKC')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('he');
}

const idFor = (key: string): string => `recent:${key}`;

/**
 * שומר חיפוש: מנקה, מסיר כפילות (לפי כותרת מנורמלת), מעביר לראש הרשימה, חותך למגבלה.
 * קלט ריק מוחזר כרשימה זהה (אותו reference).
 */
export function addRecent(
  list: readonly RecentSearch[],
  input: RecentInput,
  now: number,
  limit = MAX_RECENTS
): RecentSearch[] {
  const title = input.title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
  const key = normalizeKey(title);
  if (key.length === 0) return list as RecentSearch[];
  const previous = list.find((r) => r.id === idFor(key));
  const hasCoords = input.lat !== undefined && input.lon !== undefined && isValidCoord(input.lat, input.lon);
  const entry: RecentSearch = {
    id: idFor(key),
    title,
    subtitle: input.subtitle?.trim() || previous?.subtitle,
    lat: hasCoords ? input.lat : previous?.lat,
    lon: hasCoords ? input.lon : previous?.lon,
    searchedAt: now
  };
  return [entry, ...list.filter((r) => r.id !== entry.id)].slice(0, Math.max(0, limit));
}

export function removeRecent(list: readonly RecentSearch[], id: string): RecentSearch[] {
  return list.some((r) => r.id === id) ? list.filter((r) => r.id !== id) : (list as RecentSearch[]);
}

export const clearRecents = (): RecentSearch[] => [];

/**
 * שחזור מאחסון, כולל פורמט ישן משלב 1 (בלי searchedAt, id אחר) ופריטים פגומים.
 * מחזיר undefined אם זה בכלל לא מערך.
 */
export function sanitizeRecents(raw: unknown): RecentSearch[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: RecentSearch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.title !== 'string') continue;
    if (typeof r.id === 'string' && LEGACY_FAKE_IDS.has(r.id)) continue;
    const title = r.title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
    const key = normalizeKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const lat = typeof r.lat === 'number' ? r.lat : undefined;
    const lon = typeof r.lon === 'number' ? r.lon : undefined;
    const coords = lat !== undefined && lon !== undefined && isValidCoord(lat, lon);
    out.push({
      id: idFor(key),
      title,
      subtitle: typeof r.subtitle === 'string' && r.subtitle.trim() ? r.subtitle.trim() : undefined,
      lat: coords ? lat : undefined,
      lon: coords ? lon : undefined,
      searchedAt: typeof r.searchedAt === 'number' && Number.isFinite(r.searchedAt) ? r.searchedAt : 0
    });
  }
  return out.slice(0, MAX_RECENTS);
}

export interface RecentSearchesService {
  store: PersistedStore<RecentSearch[]>;
  /** נרשם רק אם המשתמש לא כיבה שמירת היסטוריה. מחזיר true אם נשמר. */
  record(input: RecentInput): Promise<boolean>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface RecentSearchesDeps {
  kv: KeyValueStore;
  /** בדיקת הגדרת פרטיות בזמן אמת */
  isEnabled: () => boolean;
  now?: () => number;
}

export function createRecentSearches(deps: RecentSearchesDeps): RecentSearchesService {
  const store = createPersistedStore<RecentSearch[]>({
    key: RECENTS_KEY,
    kv: deps.kv,
    initial: [],
    sanitize: sanitizeRecents
  });
  const now = deps.now ?? Date.now;
  return {
    store,
    async record(input) {
      if (!deps.isEnabled()) return false;
      const t = now();
      let changed = false;
      await store.update((list) => {
        const next = addRecent(list, input, t);
        changed = next !== list;
        return next;
      });
      return changed;
    },
    remove: (id) => store.update((list) => removeRecent(list, id)),
    clear: () => store.update(() => clearRecents())
  };
}
