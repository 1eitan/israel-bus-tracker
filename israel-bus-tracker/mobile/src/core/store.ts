/**
 * Store מתמיד קטן: מצב בזיכרון (סינכרוני, מתאים ל-useSyncExternalStore) + כתיבה לאחסון.
 *
 * עקרונות:
 *  - עדכונים מתבצעים בסדר קבלתם (fn רץ סינכרונית אחרי ה-hydrate), ללא תופעות לוואי בתוך updater של React.
 *  - כתיבות לאחסון מסודרות בתור, כדי שכתיבה ישנה לא תדרוס חדשה.
 *  - אחסון פגום / נכשל לא מפיל את האפליקציה: חוזרים לברירת המחדל וה-store ממשיך לעבוד בזיכרון (offline-first).
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly data = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
  /** לבדיקות */
  dump(): Record<string, string> {
    return Object.fromEntries(this.data);
  }
}

export interface PersistedStore<T> {
  get(): T;
  isHydrated(): boolean;
  hydrate(): Promise<void>;
  update(fn: (previous: T) => T): Promise<void>;
  reset(): Promise<void>;
  subscribe(listener: () => void): () => void;
  /** שגיאת האחסון האחרונה (קריאה פגומה / כתיבה שנכשלה), או null */
  lastError(): string | null;
}

export interface StoreOptions<T> {
  key: string;
  kv: KeyValueStore;
  initial: T;
  /** מקבל JSON גולמי (כולל פורמט ישן) ומחזיר ערך תקין, או undefined אם לא ניתן להציל אותו */
  sanitize: (raw: unknown) => T | undefined;
}

export function createPersistedStore<T>(options: StoreOptions<T>): PersistedStore<T> {
  const { key, kv, initial, sanitize } = options;
  let state = initial;
  let hydrated = false;
  let error: string | null = null;
  let hydration: Promise<void> | null = null;
  let writeChain: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  const persist = (value: T): Promise<void> => {
    writeChain = writeChain.then(async () => {
      try {
        await kv.setItem(key, JSON.stringify(value));
        error = null;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    });
    return writeChain;
  };

  const hydrate = (): Promise<void> => {
    hydration ??= (async () => {
      try {
        const raw = await kv.getItem(key);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          const clean = sanitize(parsed);
          if (clean !== undefined) state = clean;
          else error = 'stored value is invalid; using defaults';
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        hydrated = true;
        emit();
      }
    })();
    return hydration;
  };

  return {
    get: () => state,
    isHydrated: () => hydrated,
    hydrate,
    async update(fn) {
      await hydrate();
      const next = fn(state);
      if (next === state) return;
      state = next;
      emit();
      await persist(next);
    },
    async reset() {
      await hydrate();
      state = initial;
      emit();
      writeChain = writeChain.then(async () => {
        try {
          await kv.removeItem(key);
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
      });
      await writeChain;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    lastError: () => error
  };
}
