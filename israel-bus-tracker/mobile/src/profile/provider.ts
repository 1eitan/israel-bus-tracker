import { fail, notImplemented, ok, type Outcome } from '../core/outcome';
import { createPersistedStore, MemoryKeyValueStore, type KeyValueStore, type PersistedStore } from '../core/store';
import {
  DEFAULT_PROFILE_SNAPSHOT,
  type AppSettings,
  type NotificationPrefs,
  type PrivacyPrefs,
  type ProfileProvider,
  type ProfileSnapshot,
  type UserProfile
} from './types';

export const PROFILE_KEY = 'bus.profile.v1';
export const MAX_NAME_LENGTH = 40;

/** שם תצוגה: חיתוך רווחים, הסרת תווי בקרה, מגבלת אורך; ריק => null */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, MAX_NAME_LENGTH);
}

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** שחזור בטוח מאחסון: שדות חסרים/פגומים חוזרים לברירת מחדל; מבנה לא-אובייקט נדחה כולו. */
export function sanitizeProfileSnapshot(raw: unknown): ProfileSnapshot | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_PROFILE_SNAPSHOT;
  const profile = obj(r.profile);
  const settings = obj(r.settings);
  const notifications = obj(r.notifications);
  const privacy = obj(r.privacy);
  return {
    profile: { displayName: typeof profile.displayName === 'string' ? normalizeDisplayName(profile.displayName) : null },
    settings: { haptics: bool(settings.haptics, d.settings.haptics) },
    notifications: {
      arrivals: bool(notifications.arrivals, d.notifications.arrivals),
      disruptions: bool(notifications.disruptions, d.notifications.disruptions),
      serviceUpdates: bool(notifications.serviceUpdates, d.notifications.serviceUpdates)
    },
    privacy: { saveSearchHistory: bool(privacy.saveSearchHistory, d.privacy.saveSearchHistory) }
  };
}

export const SYNC_NOT_IMPLEMENTED_REASON = 'סנכרון עם חשבון דורש שרת חשבונות, שעדיין אינו קיים. ההעדפות נשמרות במכשיר בלבד.';

/** מימוש משותף מעל PersistedStore. ההבדל בין Real ל-Mock הוא רק האחסון ו-isMock. */
abstract class StoreBackedProfileProvider implements ProfileProvider {
  abstract readonly id: string;
  abstract readonly isMock: boolean;
  protected readonly store: PersistedStore<ProfileSnapshot>;

  constructor(store: PersistedStore<ProfileSnapshot>) {
    this.store = store;
  }

  peek = (): ProfileSnapshot => this.store.get();
  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);

  async load(): Promise<Outcome<ProfileSnapshot>> {
    await this.store.hydrate();
    return ok(this.store.get());
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<Outcome<ProfileSnapshot>> {
    if (patch.displayName !== undefined && patch.displayName !== null && patch.displayName.length > 200) {
      return fail('invalid_input', 'display name too long');
    }
    await this.store.update((s) => ({
      ...s,
      profile: {
        ...s.profile,
        ...(patch.displayName !== undefined ? { displayName: normalizeDisplayName(patch.displayName) } : {})
      }
    }));
    return ok(this.store.get());
  }
  async updateSettings(patch: Partial<AppSettings>): Promise<Outcome<ProfileSnapshot>> {
    await this.store.update((s) => ({ ...s, settings: { ...s.settings, ...pickBooleans(patch) } }));
    return ok(this.store.get());
  }
  async updateNotifications(patch: Partial<NotificationPrefs>): Promise<Outcome<ProfileSnapshot>> {
    await this.store.update((s) => ({ ...s, notifications: { ...s.notifications, ...pickBooleans(patch) } }));
    return ok(this.store.get());
  }
  async updatePrivacy(patch: Partial<PrivacyPrefs>): Promise<Outcome<ProfileSnapshot>> {
    await this.store.update((s) => ({ ...s, privacy: { ...s.privacy, ...pickBooleans(patch) } }));
    return ok(this.store.get());
  }
  async clearLocalData(): Promise<Outcome<void>> {
    await this.store.reset();
    return ok(undefined);
  }
  abstract syncWithAccount(): Promise<Outcome<void>>;
}

function pickBooleans<T extends object>(patch: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'boolean') (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** אמיתי: נשמר במכשיר (AsyncStorage). אין שרת חשבונות - סנכרון הוא NOT_IMPLEMENTED. */
export class RealProfileProvider extends StoreBackedProfileProvider {
  readonly id = 'profile.real';
  readonly isMock = false;
  constructor(kv: KeyValueStore) {
    super(createPersistedStore({ key: PROFILE_KEY, kv, initial: DEFAULT_PROFILE_SNAPSHOT, sanitize: sanitizeProfileSnapshot }));
  }
  async syncWithAccount(): Promise<Outcome<void>> {
    return notImplemented('profile.sync', SYNC_NOT_IMPLEMENTED_REASON);
  }
}

/** הדגמה: בזיכרון בלבד, מתחיל עם שם הדגמה; סנכרון "מצליח" רק כאן ורק כהדגמה. */
export class MockProfileProvider extends StoreBackedProfileProvider {
  readonly id = 'profile.mock';
  readonly isMock = true;
  constructor(seed: Partial<ProfileSnapshot> = {}) {
    const initial: ProfileSnapshot = {
      ...DEFAULT_PROFILE_SNAPSHOT,
      profile: { displayName: 'משתמש הדגמה' },
      ...seed
    };
    super(createPersistedStore({ key: PROFILE_KEY, kv: new MemoryKeyValueStore(), initial, sanitize: sanitizeProfileSnapshot }));
  }
  async syncWithAccount(): Promise<Outcome<void>> {
    return ok(undefined);
  }
}
